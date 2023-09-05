import { index } from "./Index";

index()
  .catch(console.log)
  .finally(() => {
    process.exit(0);
  });
