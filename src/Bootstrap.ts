import { registrar as media } from "./Models/Media";
import { registrar as spent } from "./Models/Spent";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([media, spent]);
}
