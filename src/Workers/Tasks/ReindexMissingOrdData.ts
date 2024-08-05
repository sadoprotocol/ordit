import { db } from "~Database";
import { log } from "~Libraries/Log";
import { ord, OrdInscriptionData } from "~Services/Ord";

async function main() {
  let count = 0;

  // Insert backfill criteria here
  // Backfill will be done from the latest block to the oldest block
  const cursor = db.inscriptions.collection.find({ height: null }, { sort: { _id: -1 } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }

    log(`count: ${count}, inscription id: ${inscription.id} \n`);

    let ordData: OrdInscriptionData | undefined;
    try {
      ordData = await ord.getInscription(inscription.id);
    } catch (error) {
      if (error?.message !== "Not found") {
        log(error);
      }
    }
    try {
      if (ordData) {
        await db.inscriptions.updateOne(
          { _id: inscription._id },
          {
            $set: {
              number: ordData.number,
              height: ordData.height,
              fee: ordData.fee,
              sat: ordData.sat,
              timestamp: ordData.timestamp,
            },
          },
        );
      }
    } catch (e) {
      log(e);
    }
    count += 1;
  }
}

main();
