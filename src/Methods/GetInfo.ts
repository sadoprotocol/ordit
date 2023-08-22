import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { ord as cli } from "../Services/Ord";

export const getInfo = method({
  handler: async () => {
    const info = await rpc.blockchain.getBlockchainInfo();

    const utxos = await db.outputs.getHeighestBlock();
    const ord = await cli.height();
    const worker = await getWorkerHealth();

    return {
      chain: info.chain,
      blocks: info.blocks,
      worker: {
        network: getWorkerNetworkStatus(worker.redundancyCount),
        active: worker !== false,
      },
      indexes: {
        synced: info.blocks === utxos && info.blocks === ord,
        utxos,
        ord,
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
