import { db } from "~Database";
import { Envelope } from "~Libraries/Inscriptions/Envelope";
import { getInscriptionFromEnvelope, Inscription } from "~Libraries/Inscriptions/Inscription";
import { log } from "~Libraries/Log";
import { InscriptionData, ord, OrdInscription } from "~Services/Ord";

import { rpc } from "../../Services/Bitcoin";
import { insertInscriptions } from "../Indexers/Inscriptions";

async function reIndexInscriptionsTx(txid: string) {
  const rawTx = await rpc.transactions.getRawTransaction(txid, true);
  const envelopes: Envelope[] = [];
  const _envelopes = Envelope.fromTransaction(rawTx);
  if (_envelopes) {
    console.log(_envelopes.length);
    for (const envelope of _envelopes) {
      if (envelope && envelope.isValid) {
        envelopes.push(envelope);
      }
    }
  }

  const ordData = new Map<string, OrdInscription>();
  const data = await ord.getInscriptionsForIds(envelopes.map((item) => item.id));
  for (const item of data) {
    ordData.set(item.inscription_id, item);
  }

  const inscriptions: Inscription[] = [];
  for (const envelope of envelopes) {
    const inscription = await getInscriptionFromEnvelope(envelope, ordData);
    if (inscription !== undefined) {
      inscriptions.push(inscription);
    }
  }

  // skip the first index 0 inscription
  inscriptions.shift();

  await insertInscriptions(inscriptions);
  log(`inserted inscriptions: ${JSON.stringify(inscriptions.map((v) => v.id))} \n`);
}

async function main() {
  const total = await db.inscriptions.collection.estimatedDocumentCount();
  log(`total inscriptions: ${total} \n`);

  let count = 0;

  const cursor = db.inscriptions.collection.find({ id: { $eq: 'a36f1b708e83f9dae5f27be1a35d31b571caf3e917045803e85079e75014dd4di0' }});
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }

    log(`count: ${count}, inscription id: ${inscription.id} \n`);

    // try to reindex the transaction if the index 1 exist
    let ordData: InscriptionData | undefined;
    try {
      ordData = await ord.getInscription(`${inscription.genesis}i1`);
    } catch (error) {
      if (error?.message !== "Not found") {
        log(error);
      }
    }
    if (ordData) {
      log(`index 1 exist for inscription id: ${inscription.id}, try to reindex txid: ${inscription.genesis} \n`);
      try {
        await reIndexInscriptionsTx(inscription.genesis);
      } catch (e) {
        log(e);
      }
    }
    count += 1;
  }
}

main();
