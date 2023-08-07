import { WithId } from "mongodb";

import { ord } from "../../Services/Ord";
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

  const inscription = await ord.inscription(inscriptionId);
  if (inscription === undefined) {
    throw new Error(`No inscription found for ${inscriptionId}.`);
  }

  const document: MediaDocument = {
    outpoint,
    type: inscription.mediaType,
    size: inscription.mediaSize,
    content: inscription.mediaContent,
  };

  const result = await collection.insertOne(document);
  return {
    _id: result.insertedId,
    ...document,
  };
}
