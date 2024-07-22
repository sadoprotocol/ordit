import { Db } from "mongodb";
import { Network, RuneUpdater } from "runestone-lib";
import {
  BitcoinRpcClient,
  GetBlockhashParams,
  GetBlockParams,
  GetBlockReturn,
  GetRawTransactionParams,
  GetRawTransactionReturn,
  RpcResponse,
} from "runestone-lib";
import {
  BlockIdentifier,
  RuneBlockIndex,
  RuneEtching,
  RuneLocation,
  RunestoneStorage,
  RuneUtxoBalance,
} from "runestone-lib";

import { config } from "~Config";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { rpcRequest } from "~Services/Bitcoin/Rpc";
import { client, mongo } from "~Services/Mongo";

class BitcoinRpcClientImpl implements BitcoinRpcClient {
  async getblockhash({ height }: GetBlockhashParams): Promise<RpcResponse<string>> {
    return rpcRequest("getblockhash", [height]);
  }

  async getblock<T extends GetBlockParams>({ verbosity, blockhash }: T): Promise<RpcResponse<GetBlockReturn<T>>> {
    return rpcRequest("getblock", [blockhash, verbosity]);
  }

  async getrawtransaction<T extends GetRawTransactionParams>({
    txid,
    verbose,
    blockhash,
  }: T): Promise<RpcResponse<GetRawTransactionReturn<T>>> {
    const params = blockhash ? [txid, verbose, blockhash] : [txid, verbose];
    return rpcRequest("getrawtransaction", params);
  }
}

class MongoRunestoneStorage implements RunestoneStorage {
  private db: Db | null = null;

  async connect(): Promise<void> {
    await mongo.connect();
    this.db = mongo.db;
  }

  async disconnect(): Promise<void> {
    await client.close();
  }

  async getBlockhash(blockHeight: number): Promise<string | null> {
    if (!this.db) throw new Error("Database not connected");

    const block = await this.db.collection("runes_blocks").findOne({ height: blockHeight });
    return block ? block.hash : null;
  }

  async getCurrentBlock(): Promise<BlockIdentifier | null> {
    if (!this.db) throw new Error("Database not connected");

    const block = await this.db.collection("runes_blocks").find().sort({ height: -1 }).limit(1).next();
    return block ? { height: block.height, hash: block.hash } : null;
  }

  async resetCurrentBlock(block: BlockIdentifier): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    await this.db.collection("runes_blocks").deleteMany({ height: { $gt: block.height } });

    await this.db
      .collection("runes_blocks")
      .updateOne({ height: block.height }, { $set: { hash: block.hash } }, { upsert: true });
  }

  async resetCurrentBlockHeight(height: number): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    await this.db.collection("runes_blocks").deleteMany({ height: { $gt: height } });
    const hash = this.getBlockhash(height);

    await this.db.collection("runes_blocks").updateOne({ height }, { $set: { hash } }, { upsert: true });
  }

  async seedEtchings(runes_etchings: RuneEtching[]): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    const bulkOps = runes_etchings.map((etching) => ({
      updateOne: {
        filter: { runeId: etching.runeId },
        update: { $set: convertBigIntToString(etching) },
        upsert: true,
      },
    }));

    await this.db.collection("runes_etchings").bulkWrite(bulkOps);
  }

  async saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    await this.db.collection("runes_blocks").insertOne(runeBlockIndex.block);

    const bulkEtchings = runeBlockIndex.etchings.map((etching) => ({
      updateOne: {
        filter: { runeId: etching.runeId },
        update: { $set: convertBigIntToString(etching) },
        upsert: true,
      },
    }));

    if (bulkEtchings.length > 0) {
      await this.db.collection("runes_etchings").bulkWrite(bulkEtchings);
    }

    const bulkUtxoBalances = runeBlockIndex.utxoBalances.map((utxo) => ({
      updateOne: {
        filter: { txid: utxo.txid, vout: utxo.vout },
        update: { $set: utxo },
        upsert: true,
      },
    }));

    if (bulkUtxoBalances.length > 0) {
      await this.db.collection("runes_utxoBalances").bulkWrite(bulkUtxoBalances);
    }
  }

  async getEtching(runeLocation: string): Promise<RuneEtching | null> {
    if (!this.db) throw new Error("Database not connected");

    const runeLocSplit = runeLocation.split(":", 2);
    const _runeLocation: RuneLocation = {
      block: Number(runeLocSplit[0]),
      tx: Number(runeLocSplit[1]),
    };
    const etching = await this.db.collection("runes_etchings").findOne({ runeId: _runeLocation });
    convertStringToBigInt(etching);
    return etching ? (etching as unknown as RuneEtching) : null;
  }

  async getValidMintCount(runeLocation: string, blockheight: number): Promise<number> {
    if (!this.db) throw new Error("Database not connected");

    const result = await this.db
      .collection("mintCounts")
      .aggregate([
        {
          $match: { runeId: runeLocation, blockHeight: { $lte: blockheight } },
        },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ])
      .toArray();

    return result.length > 0 ? result[0].total : 0;
  }

  async getRuneLocation(runeTicker: string): Promise<RuneLocation | null> {
    if (!this.db) throw new Error("Database not connected");

    const etching = await this.db.collection("runes_etchings").findOne({ runeTicker });
    convertStringToBigInt(etching);
    return etching ? (etching.runeId as RuneLocation) : null;
  }

  async getUtxoBalance(txid: string, vout: number): Promise<RuneUtxoBalance[]> {
    if (!this.db) throw new Error("Database not connected");

    const balances = await this.db.collection("runes_utxoBalances").find({ txid, vout }).toArray();
    return balances.map((balance) => ({
      txid: balance.txid,
      vout: balance.vout,
      address: balance.address,
      scriptPubKey: balance.scriptPubKey,
      runeId: balance.runeId,
      satValue: balance.satValue,
      runeTicker: balance.runeTicker,
      amount: BigInt(balance.amount),
    }));
  }
}

function getNetwork(): Network {
  const _net =
    config.network === "regtest"
      ? Network.REGTEST
      : config.network === "signet"
      ? Network.SIGNET
      : config.network === "testnet"
      ? Network.TESTNET
      : Network.MAINNET;
  return _net;
}

export const runesIndexer: IndexHandler = {
  name: "runes",

  async run(idx: Indexer, { height, log }) {
    if (height < RUNES_BLOCK) {
      return;
    }
    const rpc: BitcoinRpcClientImpl = new BitcoinRpcClientImpl();
    const storage: MongoRunestoneStorage = new MongoRunestoneStorage();
    storage.connect();

    const network = getNetwork();
    log(`⏳ Looking for runestones in blocks: [${idx.blocks[0].height} - ${idx.blocks.at(-1)?.height}]`);
    for (const block of idx.blocks) {
      const ts = perf();
      const runeUpdater = new RuneUpdater(network, block, true, storage, rpc);

      for (const [txIndex, tx] of block.tx.entries()) {
        await runeUpdater.indexRunes(tx, txIndex);
      }
      const etchingsLength = runeUpdater.etchings.length.toLocaleString();
      const utxoBalancesLength = runeUpdater.utxoBalances.length.toLocaleString();

      const foundRunestone = etchingsLength !== "0" || utxoBalancesLength !== "0";
      if (foundRunestone) {
        log(`💾 Block ${block.height}: ${etchingsLength} etchings and ${utxoBalancesLength} rune balance UTXO`);
      }

      await storage.saveBlockIndex(runeUpdater);
      if (foundRunestone) log(`⏳ [${ts.now} seconds]`);
    }
  },
  async reorg(height: number) {
    const storage: MongoRunestoneStorage = new MongoRunestoneStorage();
    storage.connect();
    await storage.resetCurrentBlockHeight(height);
  },
};

// ------------------------------------------
// UTILS
// ------------------------------------------

function convertStringToBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Check if the string represents a large integer and convert it to BigInt
    if (!isNaN(Number(obj)) && /^-?\d+$/.test(obj)) {
      try {
        return BigInt(obj);
      } catch (e) {
        return obj;
      }
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(convertStringToBigInt);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-next-line no-prototype-builtins
        newObj[key] = convertStringToBigInt(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-next-line no-prototype-builtins
        newObj[key] = convertBigIntToString(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
