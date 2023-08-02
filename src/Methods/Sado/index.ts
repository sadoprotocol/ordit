import { api } from "../../Api";
import { getSadoEntriesByAddress } from "./GetSadoEntriesByAddress";
import { getSadoOrderbook } from "./GetSadoOrderbook";
import { getSadoStatus } from "./GetSadoStatus";

api.register("GetSadoOrderbook", getSadoOrderbook);
api.register("GetSadoEntriesByAddress", getSadoEntriesByAddress);
api.register("GetSadoStatus", getSadoStatus);
