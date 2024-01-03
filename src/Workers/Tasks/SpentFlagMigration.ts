import { db } from "~Database";

const spentOutputs = db.outputs.deployedCollection.aggregate([
  {
    $match: {
      spent: true,
      vin: {
        $exists: false,
      },
    },
  },
  {
    $project: {
      "vout.txid": 1,
      "vout.n": 1,
    },
  },
]);

let total = 0;
while (await spentOutputs.hasNext()) {
  const output = await spentOutputs.next();
  if (!output) {
    continue;
  }
  const { txid, n } = output.vout;
  await db.outputs.addRelayed(txid, n);
  total += 1;

  console.log(`Updated data: ${total}, with id: ${output._id}`);
}

process.exit(0);
