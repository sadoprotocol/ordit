import { api } from "../../Api";
import { getBlock } from "./GetBlock";
import { getOrditInfo } from "./GetOrditInfo";

api.register("GetBlock", getBlock);
api.register("GetOrditInfo", getOrditInfo);
