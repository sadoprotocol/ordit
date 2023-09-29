import { db } from "../../Database";
import { getDeployEvent, getMintEvent, getTransferEvent } from "../../Database/Brc20/Events/Events";
import { Inscription } from "../../Database/Inscriptions";
import { log, perf } from "../../Libraries/Log";

export async function parse(blockHeight: number) {
  const eventsHeight = (await db.brc20.events.getBlockNumber()) + 1;
  if (eventsHeight > blockHeight) {
    return log("\n   💤 Indexer has latest BRC-20 inscriptions.");
  }

  log(`\n   💽 Parsing BRC-20 inscriptions.`);

  let height = eventsHeight;
  while (height <= blockHeight) {
    await resolveEvents(height);
    height += 1;
  }

  await db.brc20.events.setBlockNumber(blockHeight);
}

export async function resolve() {
  const number = await db.brc20.events.getProcessedNumber();

  let processed = 0;

  const ts = perf();

  const cursor = db.brc20.events.collection.find({ number: { $gt: number } }, { sort: { number: 1 } });
  while (await cursor.hasNext()) {
    const event = await cursor.next();
    if (event === null) {
      continue;
    }
    try {
      switch (event.op) {
        case "deploy": {
          await db.brc20.tokens.deploy(event);
          break;
        }
        case "mint": {
          await db.brc20.mints.mint(event);
          break;
        }
        case "transfer": {
          await db.brc20.transfers.transfer(event);
          break;
        }
      }
      await db.brc20.events.setProcessedNumber(event.number);
      processed += 1;
    } catch (error) {
      console.log({ event });
      throw error;
    }
  }

  if (processed === 0) {
    log("\n   💤 Event parser has no pending events.");
  } else {
    log(`\n   💾 Resolved ${processed} events [${ts.now} seconds]`);
  }
}

async function resolveEvents(blockHeight: number) {
  const ts = perf();

  const promises: Promise<any>[] = [];
  let events = 0;

  const cursor = db.inscriptions.collection.find(
    { mediaType: { $in: ["text/plain", "application/javascript"] }, height: blockHeight },
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
    log(`\n     💾 Stored ${events} events from block ${blockHeight} [${ts.now.toLocaleString()} seconds]`);
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
