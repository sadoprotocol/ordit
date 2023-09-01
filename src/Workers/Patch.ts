import { bootstrap } from "../Bootstrap";
import { db } from "../Database";
import { validateOip2Meta } from "../Utilities/Oip";

index().finally(() => {
  process.exit(0);
});

async function index() {
  await bootstrap();
  const promises: Promise<any>[] = [];
  const cursor = db.inscriptions.collection.find({ "meta.p": "vord", "meta.ty": "insc" });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    promises.push(
      db.inscriptions.updateOne(
        { id: inscription.id },
        { $set: { verified: await validateOip2Meta(inscription.meta) } }
      )
    );
  }
  await Promise.all(promises);
}
