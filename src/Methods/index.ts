import "./Address";
import "./Blockchain";
import "./Ord";
import "./Sado";
import "./Transactions";
import "./Utilities";

import { api } from "../Api";
import { getInfo } from "./GetInfo";

api.register("GetInfo", getInfo);
