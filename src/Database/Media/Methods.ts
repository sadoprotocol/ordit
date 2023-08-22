import { WithId } from "mongodb";

import { inscriptions } from "../Inscriptions";
import { collection, MediaDocument } from "./Collection";
import { getOutpointFromId } from "./Utilities";

export const media = {
  getByInscriptionId,
};

async function getByInscriptionId(inscriptionId: string): Promise<WithId<MediaDocument>> {
  const outpoint = getOutpointFromId(inscriptionId);

  const media = await collection.findOne({ outpoint });
  if (media !== null) {
    return media;
  }

  const inscription = await inscriptions.findOne({ id: inscriptionId });
  if (inscription === undefined) {
    throw new Error(`No inscription found for ${inscriptionId}.`);
  }

  const document: MediaDocument = {
    outpoint,
    type: inscription.mediaType,
    size: inscription.mediaSize,
    content: inscription.mediaContent,
    number: inscription.number,
    timestamp: inscription.timestamp,
  };

  const result = await collection.insertOne(document);
  return {
    _id: result.insertedId,
    ...document,
  };
}
