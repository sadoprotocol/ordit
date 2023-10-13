import { BadRequestError } from "@valkyr/api";
import { payments, Psbt } from "bitcoinjs-lib";
import Schema, { number, string, Type } from "computed-types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { btcToSat, getAddressType } from "../../Utilities/Bitcoin";
import { getEstimatedPsbtFee } from "../../Utilities/PSBT";
import { getTransactionOutputHex } from "../../Utilities/Transaction";
import { getBitcoinNetwork } from "../Network";
import { schema } from "../Schema";
import { getPaymentOutput } from "./GetPaymentOutput";
import { order } from "./Order";
import { parseOrderbookListing } from "./Orderbook";

export const params = Schema({
  order: order.schema,
  signature: Schema({
    value: string,
    format: schema.signature.format,
    desc: string.optional(),
    pubkey: string.optional(),
  }),
  satsPerByte: number,
});

export async function createOrderPsbt(cid: string, params: OrderParams): Promise<Psbt> {
  const utxos = await db.outputs.getByAddress(params.order.maker, { ...noSpentsFilter });
  if (utxos.length === 0) {
    throw new BadRequestError("No spendable UTXOs found on maker address", {
      details: "You need to have at least one spendable UTXO that does not contain any rare ordinals or inscriptions.",
    });
  }

  const psbt = new Psbt({ network: getBitcoinNetwork() });

  // ### Outputs

  let amount = 600; // 600 sats guarantee of change back to the maker

  for (const orderbook of params.order.orderbooks ?? []) {
    const [address, value] = parseOrderbookListing(orderbook);
    amount += value;
    psbt.addOutput({ address, value });
  }

  psbt.addOutput({
    script: payments.embed({ data: [Buffer.from(`sado=order:${cid}`, "utf8")] }).output!,
    value: 0,
  });

  // ### Inputs

  let total = 0;
  let fee = 0;

  const type = getAddressType(params.order.maker);
  if (type === undefined) {
    throw new BadRequestError("Order maker address does not match supported address types.");
  }

  const pubkey = params.signature.pubkey;

  for (const utxo of utxos) {
    const {
      vout: { txid, n },
      value,
    } = utxo;

    const sats = btcToSat(value);

    switch (type) {
      case "taproot": {
        if (pubkey === undefined) {
          throw new BadRequestError("Taproot address requires a pubkey");
        }
        let tapInternalKey = Buffer.from(pubkey, "hex");
        if (tapInternalKey.length === 33) {
          tapInternalKey = tapInternalKey.slice(1, 33);
        }
        psbt.addInput({
          hash: txid,
          index: n,
          witnessUtxo: {
            script: getPaymentOutput(tapInternalKey),
            value: sats,
          },
          tapInternalKey,
        });
        break;
      }

      case "bech32": {
        const hex = await getTransactionOutputHex(txid, n);
        if (hex === undefined) {
          throw new BadRequestError("Failed to get transaction output script");
        }
        psbt.addInput({
          hash: txid,
          index: n,
          witnessUtxo: {
            script: Buffer.from(hex, "hex"),
            value: sats,
          },
        });
        break;
      }

      default: {
        psbt.addInput({ hash: txid, index: n });
      }
    }

    total += sats;
    fee = getEstimatedPsbtFee(psbt, params.satsPerByte);

    if (total - fee >= amount) {
      break;
    }
  }

  // ### Fee & Change

  const change = total - fee;
  if (change <= 0) {
    throw new BadRequestError("Not enough funds to cover fee");
  }

  psbt.addOutput({
    address: params.order.maker,
    value: change,
  });

  return psbt;
}

export type OrderParams = Type<typeof params>;
