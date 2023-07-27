import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { hasToken } from "../Actions/HasToken";
import { config } from "../Config";
import { getHeighestBlock } from "../Models/Vout";
import { rpc } from "../Services/Bitcoin";
import { ord } from "../Services/Ord";

export const getInfo = method({
  actions: [hasToken],
  handler: async () => {
    const block = await rpc.blockchain.getBlockchainInfo();
    const indexed = await getHeighestBlock();
    return {
      chain: block.chain,
      blocks: block.blocks,
      headers: block.headers,
      worker: {
        height: await getHeighestBlock(),
        active: await getWorkerHealth(),
        utxos: config.parser.enabled,
        ordinals: config.ord.enabled,
        synced: `${((indexed / block.blocks) * 100).toFixed(2)}%`,
      },
      ord: {
        version: await ord.version(),
        status: await ord.status(),
      },
    };
  },
});

async function getWorkerHealth(): Promise<boolean> {
  try {
    await fetch(`http://localhost:${config.parser.port}/health`);
    return true;
  } catch (error) {
    return false;
  }
}
