import "./Address";
import "./Blockchain";
import "./Ord";
import "./Utilities";

import { api } from "../Api";
import { getInfo } from "./GetInfo";

api.register("GetInfo", getInfo);
