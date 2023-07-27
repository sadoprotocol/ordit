import { api } from "../../Api";
import { getInscriptions } from "./GetInscriptions";
import { getOrdinals } from "./GetOrdinals";
import { getOrdinalTraits } from "./GetOrdinalTraits";

api.register("GetInscriptions", getInscriptions);
api.register("GetOrdinals", getOrdinals);
api.register("GetOrdinalTraits", getOrdinalTraits);
