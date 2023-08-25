import { readdirSync } from "node:fs";

import { Api } from "@valkyr/api";

import { METHODS_DIR, SRC_DIR } from "./Paths";

export const api = new Api("ordit-api");

export async function registerMethods(dir = METHODS_DIR) {
  await Promise.all(getMethods(dir));
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
          api.register([...parentMethodName, item.name.replace(".ts", "")].join("."), method);
        })
      );
    }
  }
  return promises;
}
