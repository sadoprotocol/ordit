import { bootstrap } from "../../Bootstrap";
import { db } from "../../Database";
import { log, perf } from "../Log";
import { getBrc20Event } from "./Parse";

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  await bootstrap();

  log("starting BRC-20 event importer\n");

  await Promise.all([db.brc20.events.collection.deleteMany()]);

  const ts = perf();

  let promises: Promise<any>[] = [];
  let events = 0;

  const cursor = db.inscriptions.collection.find({ mediaType: "text/plain" });
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
    if (events % 10_000 === 0) {
      await Promise.all(promises);
      promises = [];
    }
    log(`\r📖 importing ${events.toLocaleString()} events`);
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  log(`\n🏁 imported ${events} events [${ts.now.toLocaleString()} seconds]\n`);
}
