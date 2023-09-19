import { db } from "../../Database";
import { getDeployEvent, getMintEvent, getTransferEvent } from "../../Database/Brc20/Events/Events";
import { Inscription } from "../../Database/Inscriptions";
import { log, perf } from "../../Libraries/Log";
import { DATA_DIR } from "../../Paths";
import { readFile, writeFile } from "../../Utilities/Files";

export async function parse(blockHeight: number) {
  const eventsHeight = await getNextBrc20Height();
  if (eventsHeight === 0) {
    return;
  }

  if (eventsHeight > blockHeight) {
    return log("\n   💤 Indexer has latest BRC-20 events");
  }

  let height = eventsHeight;
  while (height <= blockHeight) {
    await resolveEvents(height);
    height += 1;
  }

  await writeFile(`${DATA_DIR}/brc20_n`, blockHeight.toString());
}

async function resolveEvents(blockHeight: number) {
  const ts = perf();

  const promises: Promise<any>[] = [];
  let events = 0;

  const cursor = db.inscriptions.collection.find(
    { mediaType: "text/plain", height: blockHeight },
    { sort: { number: 1 } },
  );
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    const event = getBrc20Event(inscription);
    if (event === undefined) {
      continue;
    }
    promises.push(db.brc20.events.addEvent(event, inscription));
    events += 1;
  }

  await Promise.all(promises);

  if (events > 0) {
    log(`\n     📖 stored ${events} events from block ${blockHeight} [${ts.now.toLocaleString()} seconds]`);
  }
}

export function getBrc20Event(inscription: Inscription) {
  const raw = Buffer.from(inscription.mediaContent, "base64").toString("utf8");
  if (raw.includes("brc-20")) {
    try {
      const data = JSON.parse(raw.trim());
      if (isValidBrc20BaseData(data) === false) {
        return;
      }
      switch (data.op) {
        case "deploy": {
          const event = getDeployEvent(data);
          if (event !== undefined) {
            return event;
          }
          break;
        }
        case "mint": {
          const event = getMintEvent(data);
          if (event !== undefined) {
            return event;
          }
          break;
        }
        case "transfer": {
          const event = getTransferEvent(data);
          if (event !== undefined) {
            return event;
          }
          break;
        }
      }
    } catch (err) {
      // ignore malformed events
    }
  }
}

function isValidBrc20BaseData(data: any) {
  if (data.p !== "brc-20") {
    return false;
  }
  if (data.op === undefined || data.op === "") {
    return false;
  }
  if (data.tick === undefined || data.tick.length !== 4) {
    return false;
  }
  return true;
}

async function getNextBrc20Height(): Promise<number> {
  const parsedHeight = await readFile(`${DATA_DIR}/brc20_n`);
  if (parsedHeight === undefined) {
    throw new Error("Could not read brc20_n file");
  }
  return parseInt(parsedHeight, 10) + 1;
}
