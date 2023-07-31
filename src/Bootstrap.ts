import { registrar as media } from "./Models/Media";
import { registrar as output } from "./Models/Output";
import { registrar as transactions } from "./Models/Transactions";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([media, output, transactions]);
}
