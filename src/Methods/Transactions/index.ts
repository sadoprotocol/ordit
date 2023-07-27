import { api } from "../../Api";
import { getTransaction } from "./GetTransaction";

api.register("GetTransaction", getTransaction);
