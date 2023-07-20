import { logger } from "../../Logger";
import { collection, SpentDocument } from "./Collection";

/**
 * Insert list of spent vouts into the database.
 *
 * @param spents - List of spent vouts to update.
 */
export async function addSpents(spents: SpentDocument[]): Promise<void> {
  const ts = performance.now();
  collection.insertMany(spents);
  logger.addDatabase("spents", performance.now() - ts);
}

/**
 * Get the spending vin location for the given outpoint.
 *
 * @param outpoint - Vout to get spending vin for.
 */
export async function getSpendingVin(outpoint: string): Promise<string | undefined> {
  const document = await collection.findOne({ vout: outpoint });
  if (document === null) {
    return undefined;
  }
  return document.vin;
}
