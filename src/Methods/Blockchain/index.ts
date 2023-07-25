import { api } from "../../Api";
import { getBlock } from "./GetBlock";
import { getLatestBlocks } from "./GetLatestBlocks";

api.register("GetBlock", getBlock);
api.register("GetLatestBlocks", getLatestBlocks);
