import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    runeTicker: string,
    pagination: schema.pagination.optional(),
    sort: string.optional(),
  }),
  handler: async ({ runeTicker, pagination = {}, sort }) => {
    pagination.limit ??= 100;
    sort ??= "asc";
    const _sort = sort === "asc" ? -1 : 1;

    const etching = await runes.getEtchingByTicker(runeTicker);
    let totalSupply = 0n;
    if (etching?.valid) {
      const cap = etching.terms?.cap ?? 0n;
      const amount = etching.terms?.amount ?? 0n;
      const premine = etching.premine ?? 0n;
      totalSupply = BigInt(cap) * BigInt(amount) + BigInt(premine);
    }

    const filter = {
      runeTicker,
      spentTxid: { $exists: false },
    };

    const distinctAddressesPipeline = [
      { $match: filter },
      { $group: { _id: "$address" } },
      { $count: "totalDistinctAddresses" },
    ];
    const distinctAddressesResult = await runes.collectionOutputs.aggregate(distinctAddressesPipeline).toArray();
    const totalHolders = distinctAddressesResult[0]?.totalDistinctAddresses ?? 0;

    const groupedBalancesPipeline = [
      { $match: filter },
      {
        $group: {
          _id: "$address",
          totalAmount: { $sum: { $toDecimal: "$amount" } },
        },
      },
      { $sort: { totalAmount: _sort } },
      { $skip: pagination.skip ?? 0 },
      { $limit: pagination.limit },
    ];

    const groupedBalances = await runes.collectionOutputs.aggregate(groupedBalancesPipeline).toArray();

    const balances = groupedBalances.map((balance) => {
      const totalAmountBigInt = BigInt(balance.totalAmount.toString());
      const percentage = totalSupply > 0n ? Number(totalAmountBigInt) / Number(totalSupply) : 0;
      return {
        address: balance._id,
        amount: totalAmountBigInt.toString(),
        pctSupply: Math.round(percentage * 1e6) / 1e6,
      };
    });

    return {
      totalSupply: totalSupply.toString(),
      totalHolders,
      balances,
      pagination: {
        limit: pagination.limit,
        skip: pagination.skip ?? 0,
        hasNextPage: balances.length === pagination.limit, // Determine if there might be more data
      },
    };
  },
});
