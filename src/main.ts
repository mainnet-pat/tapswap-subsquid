import { inspect } from 'util';
inspect.defaultOptions.depth = 10;

// main.js
// This is the main executable of the squid indexer.
import { config } from 'dotenv';
config({
  debug: false,
  path: './.env.local',
});

// BchBatchProcessor is the class responsible for data retrieval and processing.
import { BchBatchProcessor } from '@subsquid/bch-processor';
// TypeormDatabase is the class responsible for data storage.
import { TypeormDatabase } from "@subsquid/typeorm-store";

import { assertSuccess, binToNumberUint16LE, binToUtf8, binToHex, hexToBin, vmNumberToBigInt, NonFungibleTokenCapability, CashAddressNetworkPrefix, CashAddressType, encodeCashAddress, hash160, lockingBytecodeToAddressContents, sha256 } from '@bitauth/libauth';
import { CancelledOffer, OpenOffer, TakenOffer } from './model/index.js';
import { In } from 'typeorm';
import { RpcBlock } from '@subsquid/bch-processor/lib/ds-rpc/rpc-data.js';

const BLOCK_FROM = 794520;
const BLOCK_TO = undefined; // 792775
// First we configure data retrieval.
const processor = new BchBatchProcessor()
  // // // SQD Network gateways are the primary source of blockchain data in
  // // // squids, providing pre-filtered data in chunks of roughly 1-10k blocks.
  // // // Set this for a fast sync.
  // .setGateway(process.env.GATEWAY as any)
  // // // Another data source squid processors can use is chain RPC.
  // // // In this particular squid it is used to retrieve the very latest chain data
  // // // (including unfinalized blocks) in real time. It can also be used to
  // // //   - make direct RPC queries to get extra data during indexing
  // // //   - sync a squid without a gateway (slow)
  .setRpcEndpoint("wss://electrum.imaginary.cash:50004")
  // .setP2pEndpoint("8.209.67.170:8363")
  // .setRpcEndpoint("http://localhost:8000")
  // The processor needs to know how many newest blocks it should mark as "hot".
  // If it detects a blockchain fork, it will roll back any changes to the
  // database made due to orphaned blocks, then re-run the processing for the
  // main chain blocks.
  .setFinalityConfirmation(5)
  .setBlockRange({
    from: BLOCK_FROM,
    to: BLOCK_TO,
  })
  .setFields({
    block: {
      size: true,
      difficulty: true,
      nonce: true,
      timestamp: true,
    },
    transaction: {
      // hash: true,
      // size: true,
      // sourceOutputs: true, // undefined for coinbase transactions
      // fee: true,
    },
  })
  .addTransaction({
    // empty just to get the transactions included in the block
  })
  // .addXXX() methods request data items.
  // Other .addXXX() methods (.addTransaction(), .addTrace(), .addStateDiff()
  // on EVM) are similarly feature-rich.
  // .addLog({
  //   address: [MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACEDATA_CONTRACT_ADDRESS],
  //   range: {
  //     from: process.env.BLOCK_FROM ? Number(process.env.BLOCK_FROM) : 0,
  //   },
  // });

// TypeormDatabase objects store the data to Postgres. They are capable of
// handling the rollbacks that occur due to blockchain forks.
//
// There are also Database classes for storing data to files and BigQuery
// datasets.
const db = new TypeormDatabase({ supportHotBlocks: true });

// The processor.run() call executes the data processing. Its second argument is
// the handler function that is executed once on each batch of data. Processor
// object provides the data via "ctx.blocks". However, the handler can contain
// arbitrary TypeScript code, so it's OK to bring in extra data from IPFS,
// direct RPC calls, external APIs etc.

const pkhToLockingBytecode = (pkh: Uint8Array): Uint8Array => {
  return Uint8Array.from([0x76, 0xa9, 0x14, ...pkh, 0x88, 0xac]);
}

const getAddress = (lockingBytecode: Uint8Array): string => {
  const contents = lockingBytecodeToAddressContents(lockingBytecode)

  if (contents.type !== 'unknown') {
      const encodeResult = encodeCashAddress({
          prefix: process.env.BCH_PREFIX as CashAddressNetworkPrefix,
          type: contents.type.toLowerCase() as CashAddressType,
          payload: contents.type === 'P2PK' ? hash160(contents.payload) : contents.payload,
          throwErrors: false
      })

      if (typeof encodeResult !== "string") {
          return encodeResult.address
      }
  }

  return `script-${binToHex(sha256.hash(lockingBytecode).slice(0, 16))}`
}

export const parseBinary = (opReturn: Uint8Array): Uint8Array[] => {
  const chunks: Uint8Array[] = [];
  let position = 1;

  // handle direct push, OP_PUSHDATA1, OP_PUSHDATA2;
  // OP_PUSHDATA4 is not supported in OP_RETURNs by consensus
  while (opReturn[position] !== undefined) {
    let length = 0;
    if (opReturn[position] === 0x4c) {
      length = opReturn[position + 1];
      position += 2;
    } else if (opReturn[position] === 0x4d) {
      length = binToNumberUint16LE(
        opReturn.slice(position + 1, position + 3)
      );
      position += 3;
    } else {
      length = opReturn[position];
      position += 1;
    }

    chunks.push(opReturn.slice(position, position + length));
    position += length;
  }

  return chunks;
};

function* chunks<T>(arr: Array<T>, n: number = 10000): Generator<Array<T>> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

// export interface Offer {
//   hasSats: number,
//   hasToken?: {
//     commitment?: string,
//     capability?: NonFungibleTokenCapability,
//     amount?: number,
//     tokenId?: string,
//   }

//   wantSats: number,
//   wantToken?: {
//     commitment?: string,
//     capability?: NonFungibleTokenCapability,
//     amount?: number,
//     tokenId?: string,
//   }

//   fee: number,
//   ownerAddress: string,
//   contractUtxoId: string

//   timestamp?: number
// }

const capabilityByteToStringMap: Record<string, string> = {
  "": NonFungibleTokenCapability.none,
  "01": NonFungibleTokenCapability.mutable,
  "02": NonFungibleTokenCapability.minting,
}

export const platformPubKeyHash = "e4da17ddbe40533c2a8638fdedf2c0997d46e953";

processor.run(db, async (ctx) => {
  if (ctx.blocks.length === 0 && ctx.mempoolTransactions.length === 0) {
    return;
  }

  const spendCandidatesUtxos: {
    utxo: string,
    takerAddress: string,
    txid: string,
    timestamp: number,
  }[] = [];

  const newOffers: OpenOffer[] = [];

  for (const block of ctx.blocks) {
    for (const chunk of chunks(block.transactions)) {
      for (const tx of chunk) {
        if (tx.inputs[0].unlockingBytecode.length >= 210 && tx.inputs[0].unlockingBytecode.includes("14e4da17ddbe40533c2a8638fdedf2c0997d46e953")) {
          spendCandidatesUtxos.push({
            utxo: `${tx.inputs[0].outpointTransactionHash}:0`,
            takerAddress: tx.outputs.length === 4 ? tx.outputs[1].address : tx.outputs[0].address,
            txid: tx.hash,
            timestamp: block.header.timestamp,
          })
        }

        // includes version check already with 0104
        if (!tx?.outputs?.[1]?.lockingBytecode?.startsWith("6a044d505357010404")) {
          continue;
        }

        const output = tx.outputs[1];

        const offer: OpenOffer = new OpenOffer({});
        const chunks = parseBinary(hexToBin(output.lockingBytecode));
        if (chunks.length != 10) {
          continue;
        }

        if (binToUtf8(chunks[0]) !== 'MPSW') {
          continue;
        }

        if (binToHex(chunks[3]) !== platformPubKeyHash) {
          continue;
        }

        const rawCategory = chunks[5];
        if (rawCategory.length !== 32 && rawCategory.length !== 33 && rawCategory.length != 0) {
          continue;
        }

        const rawCommitment = chunks[6];
        if (rawCommitment.length > 40) {
          continue;
        }

        offer.fee = assertSuccess(vmNumberToBigInt(chunks[9]));
        if (offer.fee < 100_000) {
          continue;
        }

        offer.wantSats = assertSuccess(vmNumberToBigInt(chunks[4]));
        offer.wantTokenId = rawCategory.length === 0 ? undefined : binToHex(rawCategory.slice(0, 32));
        offer.wantTokenCapability = rawCategory.length === 0 ? undefined : capabilityByteToStringMap[binToHex(rawCategory.slice(32, 1))] as NonFungibleTokenCapability;
        offer.wantTokenCommitment = rawCategory.length === 0 ? undefined : binToHex(rawCommitment);
        offer.wantTokenAmount = rawCategory.length === 0 ? undefined : assertSuccess(vmNumberToBigInt(chunks[7]));
        offer.hasSats = output.valueSatoshis;

        const contractOutput = tx.outputs[0];

        offer.hasTokenId = contractOutput.token?.category == null ? undefined : contractOutput.token.category;
        offer.hasTokenCapability = contractOutput.token?.nft?.capability == null ? undefined : contractOutput.token.nft.capability as NonFungibleTokenCapability;
        offer.hasTokenCommitment = contractOutput.token?.nft?.commitment == null ? undefined : contractOutput.token.nft.commitment;
        offer.hasTokenAmount = contractOutput.token?.amount == null ? undefined : contractOutput.token.amount;

        offer.makerAddress = getAddress(pkhToLockingBytecode(chunks[8]));
        offer.contractUtxo = `${tx.hash}:0`;
        offer.timestamp = Math.floor(block.header.timestamp / 1000);

        offer.id = offer.contractUtxo;

        newOffers.push(offer);
      }
    }
  }

  await ctx.store.upsert(newOffers);

  const offersToSpend = (await ctx.store.find(OpenOffer, {
    where: {
      id: In(spendCandidatesUtxos.map(candidate => candidate.utxo))
    }
  })).reduce((acc, offer) => ({...acc, [offer.id]: offer}), {} as Record<string, OpenOffer>);

  const { cancelledOffers, spentOffers: takenOffers } = spendCandidatesUtxos.reduce((acc, candidate) => {
    const offer = offersToSpend[candidate.utxo];
    if (!offer) {
      // unmatched spending tx probably from earlier versions
      // console.error("Consistency error", candidate);
      return acc;
    }

    if (candidate.takerAddress === offer.makerAddress) {
      const cancelledOffer = new CancelledOffer({
        ...offer,
        timestamp: candidate.timestamp,
        spendingTx: candidate.txid,
      })
      return {
        cancelledOffers: [...acc.cancelledOffers, cancelledOffer],
        spentOffers: acc.spentOffers
      }
    } else {
      const takenOffer = new TakenOffer({
        ...offer,
        timestamp: candidate.timestamp,
        spendingTx: candidate.txid,
        takerAddress: candidate.takerAddress,
      })
      return {
        cancelledOffers: acc.cancelledOffers,
        spentOffers: [...acc.spentOffers, takenOffer],
      }
    }
  }, {
    cancelledOffers: [] as CancelledOffer[],
    spentOffers: [] as TakenOffer[],
  });

  await ctx.store.upsert(cancelledOffers);
  await ctx.store.upsert(takenOffers);

  const offerIdsToRemove = spendCandidatesUtxos.map(candidate => candidate.utxo);
  if (offerIdsToRemove.length) {
    await ctx.store.remove(OpenOffer, offerIdsToRemove);
  }

  if (BLOCK_TO && ctx.blocks[0].header.height > BLOCK_TO) {
    console.log("Done indexing");
    process.exit(0);
  }

  // throw new Error("Rollback");
});
