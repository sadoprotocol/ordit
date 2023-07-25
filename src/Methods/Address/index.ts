import { api } from "../../Api";
import { getUnspents } from "./GetUnspents";

api.register("GetUnspents", getUnspents);
