import { api } from "../../Api";
import { getBalance } from "./GetBalance";
import { getTransactions } from "./GetTransactions";
import { getUnspents } from "./GetUnspents";

api.register("GetBalance", getBalance);
api.register("GetTransactions", getTransactions);
api.register("GetUnspents", getUnspents);
