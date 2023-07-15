import { registrar as vin } from "./Models/Vin";
import { registrar as vout } from "./Models/Vout";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([vin, vout]);
}
