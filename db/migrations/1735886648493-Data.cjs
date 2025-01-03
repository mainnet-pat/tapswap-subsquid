module.exports = class Data1735886648493 {
    name = 'Data1735886648493'

    async up(db) {
        await db.query(`CREATE TABLE "open_offer" ("id" character varying NOT NULL, "tx_index" integer NOT NULL, "has_sats" numeric NOT NULL, "has_token_commitment" text, "has_token_capability" text, "has_token_amount" numeric, "has_token_id" text, "want_sats" numeric NOT NULL, "want_token_commitment" text, "want_token_capability" text, "want_token_amount" numeric, "want_token_id" text, "fee" numeric NOT NULL, "maker_address" text NOT NULL, "contract_utxo" text NOT NULL, "timestamp" integer NOT NULL, CONSTRAINT "PK_8e010f713e31a92fcd32e000f1d" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_79352b68be06e2e587e3c94641" ON "open_offer" ("has_token_id") `)
        await db.query(`CREATE INDEX "IDX_7e52745172e9abf8d3788b2da6" ON "open_offer" ("want_token_id") `)
        await db.query(`CREATE INDEX "IDX_97a05153392a58571210b282f0" ON "open_offer" ("maker_address") `)
        await db.query(`CREATE INDEX "IDX_b4c033c4a74b57925ab6f65f36" ON "open_offer" ("contract_utxo") `)
        await db.query(`CREATE TABLE "taken_offer" ("id" character varying NOT NULL, "tx_index" integer NOT NULL, "has_sats" numeric NOT NULL, "has_token_commitment" text, "has_token_capability" text, "has_token_amount" numeric, "has_token_id" text, "want_sats" numeric NOT NULL, "want_token_commitment" text, "want_token_capability" text, "want_token_amount" numeric, "want_token_id" text, "fee" numeric NOT NULL, "maker_address" text NOT NULL, "contract_utxo" text NOT NULL, "timestamp" integer NOT NULL, "taker_address" text NOT NULL, "spending_tx" text NOT NULL, CONSTRAINT "PK_a4334a2f78c9c00c36eecb75744" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_93e66c1e7013f5dc7475a3f7f4" ON "taken_offer" ("has_token_id") `)
        await db.query(`CREATE INDEX "IDX_e462cadb93a13d24c9df3c344c" ON "taken_offer" ("want_token_id") `)
        await db.query(`CREATE INDEX "IDX_6d072473f506a35f8bf99df254" ON "taken_offer" ("maker_address") `)
        await db.query(`CREATE INDEX "IDX_f012c210474754f55193d25b66" ON "taken_offer" ("contract_utxo") `)
        await db.query(`CREATE TABLE "cancelled_offer" ("id" character varying NOT NULL, "tx_index" integer NOT NULL, "has_sats" numeric NOT NULL, "has_token_commitment" text, "has_token_capability" text, "has_token_amount" numeric, "has_token_id" text, "want_sats" numeric NOT NULL, "want_token_commitment" text, "want_token_capability" text, "want_token_amount" numeric, "want_token_id" text, "fee" numeric NOT NULL, "maker_address" text NOT NULL, "contract_utxo" text NOT NULL, "timestamp" integer NOT NULL, "spending_tx" text NOT NULL, CONSTRAINT "PK_86c9ff8e58552404227569b4867" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_b78df97fc65fe020d31ee7d7d4" ON "cancelled_offer" ("has_token_id") `)
        await db.query(`CREATE INDEX "IDX_16100ec781905422d4fcf3764a" ON "cancelled_offer" ("want_token_id") `)
        await db.query(`CREATE INDEX "IDX_7e4d4eca5261d6c1bb20ef8aa8" ON "cancelled_offer" ("maker_address") `)
        await db.query(`CREATE INDEX "IDX_e03bbaf578904c254cb2dda694" ON "cancelled_offer" ("contract_utxo") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "open_offer"`)
        await db.query(`DROP INDEX "public"."IDX_79352b68be06e2e587e3c94641"`)
        await db.query(`DROP INDEX "public"."IDX_7e52745172e9abf8d3788b2da6"`)
        await db.query(`DROP INDEX "public"."IDX_97a05153392a58571210b282f0"`)
        await db.query(`DROP INDEX "public"."IDX_b4c033c4a74b57925ab6f65f36"`)
        await db.query(`DROP TABLE "taken_offer"`)
        await db.query(`DROP INDEX "public"."IDX_93e66c1e7013f5dc7475a3f7f4"`)
        await db.query(`DROP INDEX "public"."IDX_e462cadb93a13d24c9df3c344c"`)
        await db.query(`DROP INDEX "public"."IDX_6d072473f506a35f8bf99df254"`)
        await db.query(`DROP INDEX "public"."IDX_f012c210474754f55193d25b66"`)
        await db.query(`DROP TABLE "cancelled_offer"`)
        await db.query(`DROP INDEX "public"."IDX_b78df97fc65fe020d31ee7d7d4"`)
        await db.query(`DROP INDEX "public"."IDX_16100ec781905422d4fcf3764a"`)
        await db.query(`DROP INDEX "public"."IDX_7e4d4eca5261d6c1bb20ef8aa8"`)
        await db.query(`DROP INDEX "public"."IDX_e03bbaf578904c254cb2dda694"`)
    }
}
