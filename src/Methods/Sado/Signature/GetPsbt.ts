import { BadRequestError, method } from "@valkyr/api";
import { payments, Psbt } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { getBitcoinNetwork } from "../../../Libraries/Network";
import { getPaymentOutput } from "../../../Libraries/Sado/GetPaymentOutput";
import { schema } from "../../../Libraries/Schema";
import { rpc } from "../../../Services/Bitcoin";
import { getAddressType } from "../../../Utilities/Bitcoin";
import { parseLocation } from "../../../Utilities/Transaction";

export const createSignablePsbt = method({
  params: Schema({
    location: schema.location,
    maker: string,
    pubkey: string.optional(),
  }),
  handler: async ({ location, maker, pubkey }) => {
    const [txid, index] = parseLocation(location);

    // ### Location
    // Ensure that the location the signature is being created for exists and
    // belongs to the maker.

    const tx = await rpc.transactions.getRawTransaction(txid, true);
    if (tx === undefined) {
      throw new BadRequestError("Could not find transaction");
    }

    const vout = tx.vout[index];
    if (vout.scriptPubKey.address !== maker) {
      throw new BadRequestError("Provided maker address does not match location output");
    }

    // ### Input
    // Add transaction input to the PSBT. Determine the input structure based
    // on the address type of the provided maker.

    const type = getAddressType(maker);

    if (type === undefined) {
      throw new BadRequestError("Provided maker address does not match supported address types.");
    }

    const psbt = new Psbt({ network: getBitcoinNetwork() });

    switch (type) {
      case "taproot": {
        if (pubkey === undefined) {
          throw new BadRequestError("Taproot address requires a pubkey");
        }
        const tapInternalKey = Buffer.from(pubkey, "hex");
        if (tapInternalKey.length !== 32) {
          throw new BadRequestError("Taproot pubkey must be 32 bytes");
        }
        psbt.addInput({
          hash: txid,
          index,
          witnessUtxo: {
            script: getPaymentOutput(tapInternalKey),
            value: 0,
          },
          tapInternalKey,
        });
        break;
      }

      case "bech32": {
        psbt.addInput({
          hash: txid,
          index,
          witnessUtxo: {
            script: Buffer.from(vout.scriptPubKey.hex, "hex"),
            value: 0,
          },
        });
        break;
      }

      default: {
        psbt.addInput({ hash: txid, index });
      }
    }

    // ### Output
    // Add transaction output to the PSBT. The output is a empty OP_RETURN output
    // with the maker address as the value.

    psbt.addOutput({
      script: payments.embed({ data: [Buffer.from(maker, "utf8")] }).output!,
      value: 0,
    });

    return psbt.toBase64();
  },
});
