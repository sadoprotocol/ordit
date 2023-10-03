import { INSCRIPTION_EPOCH_BLOCK } from "../../../Libraries/Inscriptions/Constants";
import { redis } from "../../../Services/Redis";
import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import { Inscription } from "../../Inscriptions";
import { collection } from "./Collection";
import { TokenEvent } from "./Events";

const BRC20_BLOCK_KEY = "brc20_b";
const BRC20_EVENTS_KEY = "brc20_e";

export const events = {
  collection,
  addEvent,
  setBlockNumber,
  getBlockNumber,
  setProcessedNumber,
  getProcessedNumber,
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

async function setBlockNumber(n: number) {
  return redis.set(BRC20_BLOCK_KEY, n);
}

async function getBlockNumber() {
  const n = await redis.get(BRC20_BLOCK_KEY);
  if (n === null) {
    return 0;
  }
  return parseInt(n, 10);
}

async function setProcessedNumber(n: number) {
  return redis.set(BRC20_EVENTS_KEY, n);
}

async function getProcessedNumber() {
  const n = await redis.get(BRC20_EVENTS_KEY);
  if (n === null) {
    return INSCRIPTION_EPOCH_BLOCK;
  }
  return parseInt(n, 10);
}
