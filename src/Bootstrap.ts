import "./Utilities/Currency";

import { registrar as ipfs } from "./Database/IPFS";
import { registrar as media } from "./Database/Media";
import { registrar as output } from "./Database/Output";
import { registrar as sado } from "./Database/Sado";
import { registrar as orders } from "./Database/SadoOrders";
import { registrar as transactions } from "./Database/Transactions";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([ipfs, media, output, sado, orders, transactions]);
}
