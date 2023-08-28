import { BadRequestError, method } from "@valkyr/api";
import { Psbt } from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { Wallet } from "../../Libraries/Wallet";
import { hasFaucetBearer } from "../../Middleware/HasFaucetBearer";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";

export default method({
  params: Schema({
    address: string,
    value: number.gte(1000).lte(100_000_000), // min 1000 sats, max 1 BTC
  }),
  actions: [hasFaucetBearer],
  handler: async ({ address, value }) => {
    const psbt = new Psbt({ network: getBitcoinNetwork() });
    const wallet = Wallet.fromSeed(config.faucet.seed).faucet();

    let total = 0;

    const outputs = await db.outputs.getUnspentByAddress(wallet.address, { sort: { value: -1 } });
    for (const utxo of outputs) {
      const { txid, n } = utxo.vout;
      const sats = btcToSat(utxo.value);
      psbt.addInput({
        hash: txid,
        index: n,
        witnessUtxo: {
          script: wallet.output,
          value: sats,
        },
        tapInternalKey: wallet.internalPubkey,
      });
      total += sats;
      if (total >= value) {
        break;
      }
    }

    psbt.addOutput({ address, value });

    const change = total - value - 1000;
    if (change <= 0) {
      throw new BadRequestError("Not enough funds to cover fee");
    }

    psbt.addOutput({
      address: wallet.address,
      value: change,
    });

    await rpc.transactions.sendRawTransaction(
      psbt.signAllInputs(wallet.signer).finalizeAllInputs().extractTransaction().toHex()
    );

    await rpc.generating.generateToAddress(1, wallet.address);
  },
});
