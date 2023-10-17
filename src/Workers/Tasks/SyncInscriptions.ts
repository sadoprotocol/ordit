import { WithId } from "mongodb";

import { db } from "~Database";
import { Inscription } from "~Database/Inscriptions";
import { log } from "~Libraries/Log";
import { InscriptionData, ord } from "~Services/Ord";
import { parseLocation } from "~Utilities/Transaction";

const total = await db.inscriptions.collection.estimatedDocumentCount();

let count = 0;
let fixed = 0;

const cursor = db.inscriptions.collection.find();
while (await cursor.hasNext()) {
  const inscription = await cursor.next();
  if (inscription === null) {
    continue;
  }

  const [txid, n] = parseLocation(inscription.outpoint);

  let data: InscriptionData | undefined;

  const $set = {
    owner: inscription.owner,
    outpoint: inscription.outpoint,
  };

  let hasChanges = false;

  // ### Sync Outpoint
  // Check the output of the inscription outpoint to see if the
  // inscription location has been spent. In which case we need
  // to identify the new inscription location.

  const output = await db.outputs.getByLocation(txid, n);
  if (output && output.vin) {
    data = await getOrdData(inscription, data);
    if (data) {
      const [txid, n] = data.satpoint.split(":") ?? [];
      if (`${txid}:${n}` !== inscription.outpoint) {
        $set.outpoint = `${txid}:${n}`;
        hasChanges = true;
      }
    }
  }

  if (hasChanges === false && inscription.outpoint.split(":").length > 2) {
    const [txid, n] = inscription.outpoint.split(":");
    $set.outpoint = `${txid}:${n}`;
    hasChanges = true;
  }

  // ### Sync Owner
  // Check if the owner has been set, and if its not set then
  // attempt to identify the owner from the inscription data.

  if (!inscription.owner) {
    data = await getOrdData(inscription, data);
    if (data && inscription.owner !== data.address) {
      $set.owner = data.address;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await db.inscriptions.updateOne({ _id: inscription._id }, { $set });
    fixed += 1;
  }

  count += 1;

  log(
    `\rSynced ${count.toLocaleString()} / ${total.toLocaleString()} inscriptions | ${fixed.toLocaleString()} inscriptions updated`,
  );
}

async function getOrdData(inscription: WithId<Inscription>, ordData?: InscriptionData) {
  if (ordData) {
    return ordData;
  }
  const data = await ord.getInscription(inscription.id);
  if (data) {
    return data;
  }
}

process.exit(0);
