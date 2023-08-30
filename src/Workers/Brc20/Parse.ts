import { db } from "../../Database";
import { Brc20Event, getDeployEvent, getMintEvent, getTransferEvent } from "../../Database/Brc20/Utilities";
import { Inscription } from "../../Database/Inscriptions";
import { log } from "../Log";

export async function parse(events: { event: Brc20Event; inscription: Inscription }[]) {
  log(`\n   🗃️ Parsing ${events.length} BRC-20 events`);
  for (const { event, inscription } of events) {
    switch (event.op) {
      case "deploy": {
        await db.brc20.tokens.deploy(event, inscription);
        break;
      }
      case "mint": {
        await db.brc20.mints.mint(event, inscription);
        break;
      }
      case "transfer": {
        await db.brc20.transfers.transfer(event, inscription);
        break;
      }
    }
  }
  log(" 👌");
}

export function getBrc20Event(inscription: Inscription) {
  const raw = Buffer.from(inscription.mediaContent, "base64").toString("utf8");
  if (raw.includes("brc-20")) {
    try {
      const data = JSON.parse(raw.trim());
      if (data.p !== "brc-20" || data.op === undefined || data.tick === undefined) {
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
