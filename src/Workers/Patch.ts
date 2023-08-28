import { bootstrap } from "../Bootstrap";
import { db } from "../Database";
import { getOutpointFromId } from "../Database/Media";

index().finally(() => {
  process.exit(0);
});

async function index() {
  await bootstrap();

  const promises: Promise<any>[] = [];

  const cursor = db.inscriptions.collection.find({ creator: { $exists: false } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    process.stdout.write(`🪪 resolving owner for ${inscription.id}\n`);
    const [txid, vout] = getOutpointFromId(inscription.id).split(":");
    const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": parseInt(vout, 10) });
    if (output === undefined || output.addresses.length === 0) {
      continue;
    }
    promises.push(db.inscriptions.updateOne({ id: inscription.id }, { $set: { creator: output.addresses[0] } }));
  }

  await Promise.all(promises);
}
