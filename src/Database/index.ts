import { brc20 } from "./Brc20";
import { indexer } from "./Indexer";
import { inscriptions } from "./Inscriptions";
import { ipfs } from "./IPFS";
import { media } from "./Media";
import { outputs } from "./Output";
import { runesBlocks, runesEtchings, runesUtxoBalances } from "./Runes";
import { sado } from "./Sado";
import { utxos } from "./Utxos";

export const db = {
  brc20,
  indexer,
  inscriptions,
  ipfs,
  media,
  outputs,
  runesBlocks,
  runesEtchings,
  runesUtxoBalances,
  sado,
  utxos,
};
