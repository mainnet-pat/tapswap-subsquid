import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class TakenOffer {
    constructor(props?: Partial<TakenOffer>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    hasSats!: bigint

    @StringColumn_({nullable: true})
    hasTokenCommitment!: string | undefined | null

    @StringColumn_({nullable: true})
    hasTokenCapability!: string | undefined | null

    @BigIntColumn_({nullable: true})
    hasTokenAmount!: bigint | undefined | null

    @Index_()
    @StringColumn_({nullable: true})
    hasTokenId!: string | undefined | null

    @BigIntColumn_({nullable: false})
    wantSats!: bigint

    @StringColumn_({nullable: true})
    wantTokenCommitment!: string | undefined | null

    @StringColumn_({nullable: true})
    wantTokenCapability!: string | undefined | null

    @BigIntColumn_({nullable: true})
    wantTokenAmount!: bigint | undefined | null

    @Index_()
    @StringColumn_({nullable: true})
    wantTokenId!: string | undefined | null

    @BigIntColumn_({nullable: false})
    fee!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    makerAddress!: string

    @Index_()
    @StringColumn_({nullable: false})
    contractUtxo!: string

    @IntColumn_({nullable: false})
    timestamp!: number

    @StringColumn_({nullable: false})
    takerAddress!: string

    @StringColumn_({nullable: false})
    spendingTx!: string
}
