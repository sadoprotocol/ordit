import { ObjectId } from "mongodb";

import { db } from "../../Database";
import { parseLocation } from "../../Database/SadoOrders";

export async function resolve() {
  return {
    duplicates: await removeDuplicateOrders(),
    resolved: await removeResolvedOrders(),
  };
}

async function removeResolvedOrders() {
  const deleteIds: ObjectId[] = [];

  const orders = await db.orders.find({});
  for (const order of orders) {
    const [txid, n] = parseLocation(order.location);
    const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
    if (output === undefined || output.vin !== undefined) {
      deleteIds.push(order._id);
    }
  }

  await db.orders.deleteMany({ _id: { $in: deleteIds } });

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
    await db.orders.collection.bulkWrite(deleteOperations);
  }

  return duplicates;
}

async function getDuplicateOrders() {
  return db.orders.collection
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
          count: { $sum: 1 }, // Count the duplicates
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          location: "$_id", // Rename _id to location
          latestId: 1,
          count: 1, // Include the count field
        },
      },
    ])
    .toArray();
}
