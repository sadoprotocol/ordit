import { bootstrap } from "../../Bootstrap";
import { db } from "../../Database";
import { getDeployEvent, getMintEvent, getTransferEvent } from "../../Database/Brc20/Utilities";
import { log } from "../Log";

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  await bootstrap();

  log("🏃‍♂️ brc-20\n");

  const cursor = db.inscriptions.collection.find({ mediaType: "text/plain" }, { sort: { number: -1 } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    const raw = Buffer.from(inscription.mediaContent, "base64").toString("utf8");
    if (raw.includes("brc-20")) {
      try {
        const data = JSON.parse(raw.trim());
        if (data.p !== "brc-20" || data.op === undefined || data.tick === undefined) {
          continue;
        }
        switch (data.op) {
          case "deploy": {
            const event = getDeployEvent(data);
            if (event === undefined) {
              continue;
            }
            log(`🏦 deploy ${event.tick}\n`);
            await db.brc20.tokens.deploy(event, inscription);
            break;
          }
          case "mint": {
            const event = getMintEvent(data);
            if (event === undefined) {
              continue;
            }
            log(`🪙 mint ${event.tick} ${event.amt}\n`);
            await db.brc20.mints.mint(event, inscription);
            break;
          }
          case "transfer": {
            const event = getTransferEvent(data);
            if (event === undefined) {
              continue;
            }
            log(`💸 transfer ${event.tick} ${event.amt}\n`);
            await db.brc20.transfers.transfer(event, inscription);
            break;
          }
        }
      } catch (err) {
        // ignore malformed events
      }
    }
  }
}
