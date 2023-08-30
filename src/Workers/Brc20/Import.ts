import { bootstrap } from "../../Bootstrap";
import { db } from "../../Database";
import { log, perf } from "../Log";
import { getBrc20Event } from "./Parse";

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  await bootstrap();

  log("starting BRC-20 importer\n");

  const ts = perf();
  let events = 0;

  const cursor = db.inscriptions.collection.find({ mediaType: "text/plain" }, { sort: { height: 1 } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    const event = getBrc20Event(inscription);
    if (event === undefined) {
      continue;
    }
    try {
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
      events += 1;
      log(`\r📖 parsed ${events.toLocaleString()} events`);
    } catch (err) {
      console.log(err);
    }
  }

  log(`\n🏁 brc-20 parser completed [${ts.now}]\n`);
}
