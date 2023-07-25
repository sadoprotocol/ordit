import { api } from "../../Api";
import { getTransactions } from "./GetTransactions";
import { getUnspents } from "./GetUnspents";

api.register("GetTransactions", getTransactions);
api.register("GetUnspents", getUnspents);
