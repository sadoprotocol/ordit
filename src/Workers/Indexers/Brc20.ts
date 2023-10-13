import { db } from "~Database";
import { Brc20Event } from "~Database/Brc20/Events/Collection";
import { getDeployEvent, getMintEvent, getTransferEvent } from "~Database/Brc20/Events/Events";
import { Inscription } from "~Database/Inscriptions";
import { IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";

export const brc20Indexer: IndexHandler = {
  name: "brc-20",

  async run(_, { log }) {
    const ts = perf();
    const events = await parseBrc20Events();
    await resolveBrc20Events(events);
    log(`🚚 Processed ${events.length.toLocaleString()} events [${ts.now} seconds]`);
  },

  async reorg() {
    // await db.inscriptions.deleteMany({ height: { $gte: height } });
  },
};

async function parseBrc20Events() {
  const lastEvent = await db.brc20.events.getLastBlock();

  const cursor = db.inscriptions.collection.find(
    {
      mediaType: { $in: ["text/plain", "application/javascript"] },
      height: {
        $gt: lastEvent,
      },
    },
    { sort: { number: 1 } },
  );

  const events: Brc20Event[] = [];
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    const event = getBrc20Event(inscription);
    if (event === undefined) {
      continue;
    }
    events.push({
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
    });
  }

  await db.brc20.events.addEvents(events);

  return events;
}

export async function resolveBrc20Events(events: Brc20Event[]) {
  for (const event of events) {
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
    } catch (error) {
      console.log({ event });
      throw error;
    }
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
