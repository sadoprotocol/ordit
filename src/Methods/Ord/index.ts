import { api } from "../../Api";
import { getOrdinalList } from "./GetOrdinalList";
import { getOrdinalTraits } from "./GetOrdinalTraits";

api.register("GetOrdinalList", getOrdinalList);
api.register("GetOrdinalTraits", getOrdinalTraits);
