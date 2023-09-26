import { BIP32Factory, BIP32Interface } from "bip32";
import * as bip39 from "bip39";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { getBitcoinNetwork } from "./Network";

const bip32 = BIP32Factory(ecc);

export class Wallet {
  #node: BIP32Interface;

  private constructor(node: BIP32Interface) {
    this.#node = node;
  }

  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  static async createSeed(): Promise<string> {
    return bip39.mnemonicToSeed(bip39.generateMnemonic()).then((seed) => seed.toString("hex"));
  }

  static fromSeed(seed: string): Wallet {
    return new Wallet(bip32.fromSeed(Buffer.from(seed, "hex"), getBitcoinNetwork()));
  }

  static fromBase58(key: string): Wallet {
    return new Wallet(bip32.fromBase58(key, getBitcoinNetwork()));
  }

  static fromPrivateKey(key: string): Wallet {
    return new Wallet(bip32.fromPrivateKey(Buffer.from(key, "hex"), Buffer.alloc(32), getBitcoinNetwork()));
  }

  static fromPublicKey(key: string): Wallet {
    return new Wallet(bip32.fromPublicKey(Buffer.from(key, "hex"), Buffer.alloc(32), getBitcoinNetwork()));
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get network(): btc.Network {
    return getBitcoinNetwork();
  }

  get node(): BIP32Interface {
    return this.#node;
  }

  get signer(): btc.Signer {
    return this.#node.tweak(btc.crypto.taggedHash("TapTweak", this.internalPubkey));
  }

  get output(): Buffer {
    const { output } = btc.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: getBitcoinNetwork(),
    });
    if (output === undefined) {
      throw new Error("Failed to generate output");
    }
    return output;
  }

  get address(): string {
    const { address } = btc.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: getBitcoinNetwork(),
    });
    if (address === undefined) {
      throw new Error("Failed to resolve address from loaded wallet");
    }
    return address;
  }

  get privateKey(): Buffer | undefined {
    return this.#node.privateKey;
  }

  get internalPubkey(): Buffer {
    return this.publicKey.slice(1, 33);
  }

  get publicKey(): Buffer {
    return this.#node.publicKey;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  faucet(): Wallet {
    return this.derive("0/0");
  }

  receive(index: number): Wallet {
    return this.derive(`0/${index}`);
  }

  change(index: number): Wallet {
    return this.derive(`1/${index}`);
  }

  derive(path: string): Wallet {
    return new Wallet(this.#node.deriveHardened(84).deriveHardened(1).derivePath(path));
  }
}
