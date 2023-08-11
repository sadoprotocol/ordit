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
    let result: any[] = [];
    let cursors: string[] = [];

    const limit = pagination?.limit ?? 10;
    const from = pagination?.next ?? pagination?.prev;
    const reverse = pagination?.prev !== undefined;

    const cursor = await getSearchAggregate(address, pagination);
    while (await cursor.hasNext()) {
      const document = await cursor.next();
      if (document === null) {
        continue;
      }
      const { _id, txid, height } = document;
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      result.push({
        blockHeight: height,
        ...(await getExpandedTransaction(tx, options)),
      });
      cursors.push(_id.toString());
      if (result.length === limit) {
        break;
      }
    }

    result = reverse ? result.reverse() : result;
    cursors = reverse ? cursors.reverse() : cursors;

    const prev = from === undefined ? null : cursors[0] ?? null;
    const next = cursors[cursors.length - 1] ?? null;

    return {
      transactions: result.map(format),
      options: {
        ord: options?.ord ?? false,
        hex: options?.hex ?? false,
        witness: options?.witness ?? false,
      },
      pagination: {
        limit: pagination?.limit ?? 10,
        prev: reverse ? ((await cursor.hasNext()) ? prev : null) : prev,
        next: reverse ? next : (await cursor.hasNext()) ? next : null,
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
