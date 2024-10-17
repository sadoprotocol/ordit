import { registrar as brc20Events } from "./Database/Brc20/Events/Collection";
import { registrar as brc20Holders } from "./Database/Brc20/Holders/Collection";
import { registrar as brc20Mints } from "./Database/Brc20/Mints/Collection";
import { registrar as brc20Tokens } from "./Database/Brc20/Tokens/Collection";
import { registrar as brc20Transfers } from "./Database/Brc20/Transfers/Collection";
import { registrar as inscriptions } from "./Database/Inscriptions/Collection";
import { registrar as ipfs } from "./Database/IPFS/Collection";
import { registrar as media } from "./Database/Media/Collection";
import { registrar as output } from "./Database/Output/Collection";
import { registrarBlockInfo as runesBlockInfo } from "./Database/Runes/Collection";
import { registrarEtching as runesEtching } from "./Database/Runes/Collection";
import { registrarOutput as runesOutput } from "./Database/Runes/Collection";
import { registrar as sadoEvents } from "./Database/Sado/Events/Collection";
import { registrar as sadoOrders } from "./Database/Sado/Orders/Collection";
import { registrar as utxos } from "./Database/Utxos/Collection";
import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
  await mongo.register([
    brc20Events,
    brc20Holders,
    brc20Mints,
    brc20Tokens,
    brc20Transfers,
    inscriptions,
    ipfs,
    media,
    output,
    runesBlockInfo,
    runesEtching,
    runesOutput,
    sadoEvents,
    sadoOrders,
    utxos,
  ]);
}
