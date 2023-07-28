import { api } from "../../Api";
import { getTransaction } from "./GetTransaction";
import { sendRawTransaction } from "./SendRawTransaction";

api.register("GetTransaction", getTransaction);
api.register("SendRawTransaction", sendRawTransaction);
