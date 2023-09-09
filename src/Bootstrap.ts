import { registrar as brc20Events } from "./Database/Brc20/Events/Collection";
import { registrar as brc20Accounts } from "./Database/Brc20/Holders/Collection";
import { registrar as brc20Mints } from "./Database/Brc20/Mints/Collection";
import { registrar as brc20Tokens } from "./Database/Brc20/Tokens/Collection";
import { registrar as brc20Transfers } from "./Database/Brc20/Transfers/Collection";
import { registrar as inscriptions } from "./Database/Inscriptions/Collection";
import { registrar as ipfs } from "./Database/IPFS/Collection";
import { registrar as media } from "./Database/Media/Collection";
import { registrar as ordinalSatRanges } from "./Database/Ordinals/SatRanges/Collection";
import { registrar as output } from "./Database/Output/Collection";
import { registrar as sado } from "./Database/Sado/Collection";
import { registrar as orders } from "./Database/SadoOrders/Collection";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([
    brc20Accounts,
    brc20Events,
    brc20Mints,
    brc20Tokens,
    brc20Transfers,
    inscriptions,
    ipfs,
    media,
    ordinalSatRanges,
    output,
    sado,
    orders,
  ]);
}
