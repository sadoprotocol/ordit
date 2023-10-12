import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import { Inscription } from "../../Inscriptions";
import { collection } from "./Collection";
import { TokenEvent } from "./Events";

export const events = {
  collection,
  addEvent,
};

async function addEvent(event: TokenEvent, inscription: Inscription) {
  return collection
    .insertOne({
      ...event,
      meta: {
        slug: event.tick.toLowerCase(),
        inscription: inscription.id,
        address: inscription.creator,
        block: inscription.height,
        number: inscription.number,
        timestamp: inscription.timestamp,
      },
      number: inscription.height + inscription.number,
    })
    .catch(ignoreDuplicateErrors);
}
