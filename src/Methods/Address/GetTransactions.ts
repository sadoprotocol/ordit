import { method } from "@valkyr/api";
import Schema, { boolean, number, string, Type } from "computed-types";
import { AggregationCursor, WithId } from "mongodb";

import { limiter } from "~Libraries/Limiter";

import { db } from "../../Database";
import { isCoinbaseTx, rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { ExpandedTransaction, getExpandedTransaction, getNullData } from "../../Utilities/Transaction";

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

export default method({
  params: Schema({
    address: string,
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, pagination }) => {
    let cursors: string[] = [];

    const limit = pagination?.limit ?? 10;
    const from = pagination?.next ?? pagination?.prev;
    const reverse = pagination?.prev !== undefined;

    let shouldSkipCursor = true;

    const resultLimiter = limiter<any>(10);

    const cursor = await getSearchAggregate(address, reverse);
    while (await cursor.hasNext()) {
      const document = await cursor.next();
      if (document === null) {
        continue;
      }

      if (from !== undefined) {
        if (document._id.toString() === from) {
          shouldSkipCursor = false;
          continue;
        }
        if (shouldSkipCursor) {
          continue;
        }
      }

      const { _id, txid, height } = document;
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }

      cursors.push(_id.toString());
      resultLimiter.push(async () => {
        return {
          _id: _id.toString(),
          coinbase: isCoinbaseTx(tx),
          blockHeight: height,
          ...(await getExpandedTransaction(tx, options)),
        };
      });

      if (resultLimiter.length() === limit) {
        break;
      }
    }

    let result = await resultLimiter.run();
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
  reverse = false,
): AggregationCursor<
  WithId<{
    txid: string;
    height: number;
  }>
> {
  return db.outputs.collection.aggregate([
    {
      $match: { addresses: address },
    },
    {
      $project: {
        txid: {
          $cond: {
            if: { $ifNull: ["$vin", false] }, // Check if 'vin' field exists
            then: "$vin.txid",
            else: "$vout.txid",
          },
        },
        height: {
          $cond: {
            if: { $ifNull: ["$vin", false] }, // Check if 'vin' field exists
            then: "$vin.block.height",
            else: "$vout.block.height",
          },
        },
      },
    },
    {
      $sort: {
        height: reverse ? 1 : -1,
      },
    },
    {
      $group: {
        _id: "$txid",
        doc: { $first: "$$ROOT" },
      },
    },
    {
      $replaceRoot: { newRoot: "$doc" },
    },
    {
      $sort: {
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

function format(tx: { _id: string; coinbase: boolean } & Transaction) {
  return {
    _id: tx._id,
    txid: tx.txid,
    coinbase: tx.coinbase,
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
      vout.scriptPubKey.utf8 = getNullData(vout.scriptPubKey.asm);
      return vout;
    }),
    vsize: tx.vsize,
    weight: tx.weight,
  };
}

export type Options = Type<typeof options>;

export type Pagination = Type<typeof pagination>;

type Transaction = {
  addresses: string[];
  blockHeight: number;
} & ExpandedTransaction;
