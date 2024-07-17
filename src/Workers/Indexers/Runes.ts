import { Db } from "mongodb";
import { Network, RunestoneIndexer, RunestoneIndexerOptions } from "runestone-lib";
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

import { IndexHandler } from "~Libraries/Indexer/Indexer";
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

    const block = await this.db.collection("blocks").findOne({ height: blockHeight });
    return block ? block.hash : null;
  }

  async getCurrentBlock(): Promise<BlockIdentifier | null> {
    if (!this.db) throw new Error("Database not connected");

    const block = await this.db.collection("blocks").find().sort({ height: -1 }).limit(1).next();
    return block ? { height: block.height, hash: block.hash } : null;
  }

  async resetCurrentBlock(block: BlockIdentifier): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    await this.db.collection("blocks").deleteMany({ height: { $gt: block.height } });

    await this.db
      .collection("blocks")
      .updateOne({ height: block.height }, { $set: { hash: block.hash } }, { upsert: true });
  }

  async seedEtchings(runes_etchings: RuneEtching[]): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    const bulkOps = runes_etchings.map((etching) => ({
      updateOne: {
        filter: { runeId: etching.runeId },
        update: { $set: etching },
        upsert: true,
      },
    }));

    await this.db.collection("runes_etchings").bulkWrite(bulkOps);
  }

  async saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    await this.db.collection("blocks").insertOne(runeBlockIndex.block);

    const bulkEtchings = runeBlockIndex.etchings.map((etching) => ({
      updateOne: {
        filter: { runeId: etching.runeId },
        update: { $set: etching },
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
      runeTicker: balance.runeTicker,
      amount: BigInt(balance.amount),
    }));
  }
}

export const runesIndexer: IndexHandler = {
  name: "runes",

  async run() {
    const bitcoinRpcClient: BitcoinRpcClientImpl = new BitcoinRpcClientImpl();
    const network: Network = Network.REGTEST;
    const storage: MongoRunestoneStorage = new MongoRunestoneStorage();
    const options: RunestoneIndexerOptions = { bitcoinRpcClient, network, storage };
    const indexer = new RunestoneIndexer(options);
    await indexer.start();
    await indexer.updateRuneUtxoBalances();
  },
};
