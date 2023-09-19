import { bootstrap } from "../../Bootstrap";
import { db } from "../../Database";
import { log, perf } from "../../Libraries/Log";

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  await bootstrap();

  log("starting BRC-20 resolver\n");

  await Promise.all([
    db.brc20.holders.collection.deleteMany(),
    db.brc20.mints.collection.deleteMany(),
    db.brc20.tokens.collection.deleteMany(),
    db.brc20.transfers.collection.deleteMany(),
  ]);

  const ts = perf();
  let events = 0;

  const cursor = db.brc20.events.collection.find({}, { sort: { "meta.block": 1, "meta.number": 1 } });
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
      events += 1;
      log(`\r📖 parsed ${events.toLocaleString()} events`);
    } catch (error) {
      console.log({ event });
      throw error;
    }
  }

  log(`\n🏁 brc-20 parser completed [${ts.now}]\n`);
}
