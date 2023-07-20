import { api } from "../../Api";
import { getBlock } from "./GetBlock";
import { getLatestBlocks } from "./GetLatestBlocks";
import { getOrditInfo } from "./GetOrditInfo";

api.register("GetBlock", getBlock);
api.register("GetLatestBlocks", getLatestBlocks);
api.register("GetOrditInfo", getOrditInfo);
