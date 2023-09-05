import { db } from "../../Database";
import { getDeployEvent, getMintEvent, getTransferEvent, TokenEvent } from "../../Database/Brc20/Events/Events";
import { Inscription } from "../../Database/Inscriptions";
import { log } from "../Log";

export async function parse() {
  log(`\n   🗃️ Parsing BRC-20 events`);

  const events: { event: TokenEvent; inscription: Inscription }[] = [];

  // for (const { event, inscription } of events) {
  //   switch (event.op) {
  //     case "deploy": {
  //       await db.brc20.tokens.deploy(event, inscription);
  //       break;
  //     }
  //     case "mint": {
  //       await db.brc20.mints.mint(event, inscription);
  //       break;
  //     }
  //     case "transfer": {
  //       await db.brc20.transfers.transfer(event, inscription);
  //       break;
  //     }
  //   }
  // }
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
