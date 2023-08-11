import { method } from "@valkyr/api";
import Schema, { boolean, number, string, Type } from "computed-types";
import { AggregationCursor, ObjectId, WithId } from "mongodb";

import { db } from "../../Database";
import { TransactionDocument } from "../../Database/Transactions";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getExpandedTransaction } from "../../Utilities/Transaction";

const options = Schema({
  ord: boolean.optional(),
  hex: boolean.optional(),
  witness: boolean.optional(),
});

const pagination = Schema({
  limit: number.optional(),
  prev: string.optional(),
  next: string.optional(),
});

export const getTransactions = method({
  params: Schema({
    address: string,
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, pagination }) => {
    const transactions: any[] = [];

    const documents = await getSearchAggregate(address, pagination).toArray();
    for (const { txid, height } of documents) {
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      transactions.push({
        blockHeight: height,
        ...(await getExpandedTransaction(tx, options)),
      });
    }

    return {
      transactions: transactions.map(format),
      options: {
        ord: options?.ord ?? false,
        hex: options?.hex ?? false,
        witness: options?.witness ?? false,
      },
      pagination: {
        limit: 10,
        prev: documents[0]?._id,
        next: documents[documents.length - 1]?._id,
      },
    };
  },
});

function getSearchAggregate(
  address: string,
  pagination?: Pagination
): AggregationCursor<
  WithId<{
    txid: string;
    height: number;
  }>
> {
  const matchStage: any = { addresses: address };

  let reverse = false;

  const offset = pagination?.next ?? pagination?.prev;
  if (offset !== undefined) {
    const cursor = new ObjectId(offset);
    reverse = pagination?.prev !== undefined;
    matchStage._id = reverse ? { $gt: cursor } : { $lt: cursor };
  }

  return db.outputs.collection.aggregate([
    {
      $match: matchStage,
    },
    {
      $project: {
        txid: {
          $cond: {
            if: { $eq: [{ $type: "$vin" }, "object"] },
            then: "$vin.txid",
            else: "$vout.txid",
          },
        },
        height: {
          $cond: {
            if: { $eq: [{ $type: "$vin" }, "object"] },
            then: "$vin.block.height",
            else: "$vout.block.height",
          },
        },
        type: {
          $cond: {
            if: { $eq: [{ $type: "$vin" }, "object"] },
            then: "vin",
            else: "vout",
          },
        },
      },
    },
    {
      $sort: {
        _id: reverse ? 1 : -1,
        height: reverse ? 1 : -1,
      },
    },
    {
      $limit: pagination?.limit ?? 10,
    },
    {
      $project: {
        _id: 1,
        txid: 1,
        height: 1,
      },
    },
  ]);
}

function format(tx: TransactionDocument) {
  return {
    txid: tx.txid,
    blockHash: tx.blockhash,
    blockHeight: tx.blockHeight,
    blockTime: tx.blocktime,
    confirmations: tx.confirmations,
    fee: tx.fee,
    hash: tx.hash,
    hex: tx.hex,
    locktime: tx.locktime,
    size: tx.size,
    vin: tx.vin,
    vout: tx.vout.map((vout: any) => {
      vout.sats = btcToSat(vout.value);
      return vout;
    }),
    vsize: tx.vsize,
    weight: tx.weight,
  };
}

export type Options = Type<typeof options>;

export type Pagination = Type<typeof pagination>;
