import "./Utilities/Currency";

import { registrar as ipfs } from "./Models/IPFS";
import { registrar as media } from "./Models/Media";
import { registrar as output } from "./Models/Output";
import { registrar as sado } from "./Models/Sado";
import { registrar as orders } from "./Models/SadoOrders";
import { registrar as transactions } from "./Models/Transactions";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([ipfs, media, output, sado, orders, transactions]);
}
