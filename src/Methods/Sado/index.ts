import { api } from "../../Api";
import { getOrdersByAddress } from "./GetOrdersByAddress";
import { getSadoStatus } from "./GetSadoStatus";

api.register("GetOrdersByAddress", getOrdersByAddress);
api.register("GetSadoStatus", getSadoStatus);
