import { api } from "../../Api";
import { getSadoEntriesByAddress } from "./GetSadoEntriesByAddress";
import { getSadoOrderbook } from "./GetSadoOrderbook";
import { getSadoStatus } from "./GetSadoStatus";
import { parseSadoBlock } from "./ParseSadoBlock";
import { parseSadoOrders } from "./ParseSadoOrders";

api.register("GetSadoOrderbook", getSadoOrderbook);
api.register("GetSadoEntriesByAddress", getSadoEntriesByAddress);
api.register("GetSadoStatus", getSadoStatus);
api.register("ParseSadoBlock", parseSadoBlock);
api.register("ParseSadoOrders", parseSadoOrders);
