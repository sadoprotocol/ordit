import debug from "debug";

import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { DATA_DIR } from "../../Paths";
import { rpc } from "../../Services/Bitcoin";
import { api } from "../../Services/Ord";
import { readFile, writeFile } from "../../Utilities/Files";

const log = debug("ord-inscriptions");

export async function parse() {
  const parsedHeight = await readFile(`${DATA_DIR}/inscriptions_n`);
  if (parsedHeight === undefined) {
    return;
  }

  const blockHeight = await rpc.blockchain.getBlockCount();

  await waitForBlock(blockHeight);

  const promises: Promise<any>[] = [];

  let inscriptions: Inscription[] = [];

  let height = parseInt(parsedHeight);
  while (height <= blockHeight) {
    const data = await getInscriptions(height);
    for (const inscription of data) {
      const [media, format] = inscription.media.kind.split(";");
      const [type, subtype] = media.split("/");
      inscriptions.push({
        id: inscription.id,
        owner: inscription.address,
        sat: inscription.sat,
        mimeType: type,
        mimeSubtype: subtype,
        mediaType: media,
        mediaCharset: format?.split("=")[1],
        mediaSize: inscription.media.size,
        mediaContent: inscription.media.content,
        timestamp: inscription.timestamp,
        height: inscription.height,
        fee: inscription.fee,
        genesis: inscription.genesis,
        number: inscription.number,
        outpoint: inscription.output,
      });
    }
    promises.push(db.inscriptions.insertMany(inscriptions));
    log("resolved %d inscriptions from block %s", inscriptions.length, height);
    inscriptions = [];
    height += 1;
  }
  await Promise.all(promises);
  await writeFile(`${DATA_DIR}/inscriptions_n`, height.toString());
}

async function getInscriptions(blockHeight: number): Promise<any> {
  return api(`/inscriptions/block/${blockHeight}`);
}

/**
 * Ensure that ord has processed the block before continuing.
 *
 * @param blockHeight - Block height to wait for.
 */
async function waitForBlock(blockHeight: number): Promise<void> {
  const ordHeight = await api<number>("/blockheight");
  if (ordHeight <= blockHeight) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return waitForBlock(blockHeight);
}
