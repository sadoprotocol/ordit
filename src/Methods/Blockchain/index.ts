import { api } from "../../Api";
import { getBlock } from "./GetBlock";
import { getBlocks } from "./GetBlocks";
import { getBlockStats } from "./GetBlockStats";
import { getLatestBlocks } from "./GetLatestBlocks";
import { getMempoolInfo } from "./GetMempoolInfo";
import { getRawMempool } from "./GetRawMempool";

api.register("GetBlock", getBlock);
api.register("GetBlocks", getBlocks);
api.register("GetBlockStats", getBlockStats);
api.register("GetLatestBlocks", getLatestBlocks);
api.register("GetMempoolInfo", getMempoolInfo);
api.register("GetRawMempool", getRawMempool);
