import { api } from "../../Api";
import { getBlock } from "./GetBlock";
import { getLatestBlocks } from "./GetLatestBlocks";
import { getMempoolInfo } from "./GetMempoolInfo";
import { getRawMempool } from "./GetRawMempool";

api.register("GetBlock", getBlock);
api.register("GetLatestBlocks", getLatestBlocks);
api.register("GetMempoolInfo", getMempoolInfo);
api.register("GetRawMempool", getRawMempool);
