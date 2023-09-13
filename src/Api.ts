import { readdirSync } from "node:fs";

import { Api } from "@valkyr/api";

import { METHODS_DIR, SRC_DIR } from "./Paths";
import { log } from "./Workers/Log";

export const api = new Api();

export async function registerMethods(dir = METHODS_DIR) {
  log("\n📖 registering methods\n");
  await Promise.all(getMethods(dir));
  log("\n");
}

function getMethods(dir: string, promises: Promise<any>[] = []): Promise<any>[] {
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      getMethods(`${dir}/${item.name}`, promises);
    }
    if (item.isFile()) {
      const relativeFilePath = `.${dir.replace(SRC_DIR, "")}/${item.name}`;
      const parentMethodName = dir
        .replace(METHODS_DIR, "")
        .split("/")
        .filter((c) => c !== "");
      promises.push(
        import(relativeFilePath).then(({ default: method }) => {
          const methodName = [...parentMethodName, item.name.replace(".ts", "")].join(".");
          api.register(methodName, method);
          log(`\n👌 ${methodName}`, 2);
        }),
      );
    }
  }
  return promises;
}
