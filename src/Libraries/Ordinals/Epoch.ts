import { COIN_VALUE, SUBSIDY_HALVING_INTERVAL } from "./Constants";
import { Height } from "./Height";
import { Sat, STARTING_SATS } from "./Sat";

export class Epoch {
  static readonly FIRST_POST_SUBSIDY = new Epoch(33);

  #subsidy?: number;
  #startingSat?: Sat;
  #startingHeight?: Height;

  constructor(readonly n: number) {}

  static from(sat: Sat): Epoch {
    let i = 1;
    while (i <= 33) {
      if (sat.n < STARTING_SATS[i].n) {
        return new Epoch(i - 1);
      }
      i++;
    }
    return new Epoch(33);
  }

  get subsidy(): number {
    if (this.#subsidy === undefined) {
      if (this.n < Epoch.FIRST_POST_SUBSIDY.n) {
        this.#subsidy = Math.floor((50 * COIN_VALUE) / Math.pow(2, this.n));
      } else {
        this.#subsidy = 0;
      }
    }
    return this.#subsidy;
  }

  get startingSat(): Sat {
    if (this.#startingSat === undefined) {
      this.#startingSat = STARTING_SATS[this.n] || STARTING_SATS[STARTING_SATS.length - 1];
    }
    return this.#startingSat;
  }

  get startingHeight(): Height {
    if (this.#startingHeight === undefined) {
      this.#startingHeight = new Height(this.n * SUBSIDY_HALVING_INTERVAL);
    }
    return this.#startingHeight;
  }
}
