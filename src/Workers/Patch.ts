import { bootstrap } from "../Bootstrap";
import { db } from "../Database";
import { getMetaFromTxId } from "../Utilities/Oip";

index().finally(() => {
  process.exit(0);
});

async function index() {
  await bootstrap();

  const count = await db.inscriptions.count({ meta: { $exists: false } });
  const cursor = db.inscriptions.collection.find({ meta: { $exists: false } });

  let i = 1;
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    process.stdout.write(`🔎 checking ${inscription.id} | ${i} / ${count}\n`);
    if (inscription.meta === undefined) {
      const meta = await getMetaFromTxId(inscription.genesis);
      if (meta !== undefined) {
        await db.inscriptions.collection.updateOne({ id: inscription.id }, { $set: { meta } });
        process.stdout.write(`  📝 added meta to ${inscription.id}\n`);
      }
    }
    i += 1;
  }
}
