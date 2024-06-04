import { db } from "~Database";
import { log } from "~Libraries/Log";
import { ord, OrdInscriptionData } from "~Services/Ord";

async function main() {
  const total = await db.inscriptions.collection.estimatedDocumentCount();
  log(`total inscriptions: ${total} \n`);

  let count = 0;

  const cursor = db.inscriptions.collection.find({}, { sort: { _id: -1 } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }

    log(`count: ${count}, inscription id: ${inscription.id} \n`);

    if (!inscription.mediaEncoding) {
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
          if (ordData.content_encoding) {
            log(
              `found content_encoding inscription: ${ordData.content_encoding}, update inscription data: ${inscription.id}, document id: ${inscription._id} \n`,
            );
            await db.inscriptions.updateOne(
              { _id: inscription._id },
              {
                $set: {
                  mediaEncoding: ordData.content_encoding,
                },
              },
            );
          }
        }
      } catch (e) {
        log(e);
      }
    }
    count += 1;
  }
}

main();
