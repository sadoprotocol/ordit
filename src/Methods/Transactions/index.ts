import { api } from "../../Api";
import { getLatestTransactions } from "./GetLatestTransactions";
import { getTransaction } from "./GetTransaction";
import { sendRawTransaction } from "./SendRawTransaction";

api.register("GetLatestTransactions", getLatestTransactions);
api.register("GetTransaction", getTransaction);
api.register("SendRawTransaction", sendRawTransaction);
