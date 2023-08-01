import { api } from "../../Api";
import { getOrdersByAddress } from "./GetOrdersByAddress";

api.register("GetOrdersByAddress", getOrdersByAddress);
