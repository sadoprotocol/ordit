import { api } from "../../Api";
import { getTransaction } from "./GetTransaction";
import { getTransactions } from "./GetTransactions";
import { sendRawTransaction } from "./SendRawTransaction";

api.register("GetLatestTransactions", getTransactions);
api.register("GetTransactions", getTransactions);
api.register("GetTransaction", getTransaction);
api.register("SendRawTransaction", sendRawTransaction);
