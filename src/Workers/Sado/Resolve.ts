import { ObjectId } from "mongodb";

import { db } from "../../Database";
import { parseLocation } from "../../Utilities/Transaction";

export async function resolve() {
  return {
    duplicates: await removeDuplicateOrders(),
    resolved: await removeResolvedOrders(),
  };
}

async function removeResolvedOrders() {
  const deleteIds: ObjectId[] = [];

  const orders = await db.sado.orders.find({});
  for (const order of orders) {
    const [txid, n] = parseLocation(order.location);
    const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
    if (output === undefined || output.vin !== undefined) {
      deleteIds.push(order._id);
    }
  }

  await db.sado.orders.deleteMany({ _id: { $in: deleteIds } });

  return deleteIds;
}

async function removeDuplicateOrders() {
  const duplicates = await getDuplicateOrders();

  const deleteOperations = duplicates.map((order) => ({
    deleteMany: {
      filter: { _id: { $ne: order.latestId }, location: order.location },
    },
  }));

  if (deleteOperations.length > 0) {
    await db.sado.orders.collection.bulkWrite(deleteOperations);
  }

  return duplicates;
}

async function getDuplicateOrders() {
  return db.sado.orders.collection
    .aggregate([
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" },
        },
      },
      {
        $match: {
          count: { $gte: 2 },
        },
      },
      {
        $unwind: "$docs",
      },
      {
        $replaceRoot: { newRoot: "$docs" },
      },
      {
        $sort: {
          "block.height": -1,
        },
      },
      {
        $group: {
          _id: "$location",
          latestId: { $first: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          location: "$_id",
          latestId: 1,
          count: 1,
        },
      },
    ])
    .toArray();
}
