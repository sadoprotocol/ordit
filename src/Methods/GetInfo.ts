import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { ord } from "../Services/Ord";

export const getInfo = method({
  handler: async () => {
    const block = await rpc.blockchain.getBlockchainInfo();
    const indexed = await db.outputs.getHeighestBlock();
    const worker = await getWorkerHealth();
    return {
      chain: block.chain,
      blocks: block.blocks,
      headers: block.headers,
      worker: {
        height: indexed,
        active: worker !== false,
        network: getWorkerNetworkStatus(worker.redundancyCount),
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

async function getWorkerHealth(): Promise<any> {
  try {
    const res = await fetch(`http://${config.parser.host}:${config.parser.port}/health`);
    if (res.status === 200) {
      return res.json();
    }
    return false;
  } catch (error) {
    return false;
  }
}

function getWorkerNetworkStatus(redundancyCount?: number): string {
  switch (redundancyCount) {
    case 0:
    case 1: {
      return "optimal";
    }
    case 2:
    case 3: {
      return "degraded";
    }
    default: {
      return "dormant";
    }
  }
}
