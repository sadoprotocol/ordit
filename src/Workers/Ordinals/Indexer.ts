import { bootstrap } from "../../Bootstrap";
import { parse } from "./Parse";

index()
  .catch(console.log)
  .finally(() => {
    process.exit(0);
  });

async function index() {
  await bootstrap();
  await parse();
}
