import { DIFFCHANGE_INTERVAL } from "./Constants";
import { Epoch } from "./Epoch";
import { Sat } from "./Sat";

export class Height {
  #subsidy?: number;
  #startingSat?: Sat;
  #periodOffset?: number;

  constructor(readonly n: number) {}

  get subsidy(): number {
    if (this.#subsidy === undefined) {
      this.#subsidy = new Epoch(this.n).subsidy;
    }
    return this.#subsidy;
  }

  get startingSat(): Sat {
    if (this.#startingSat === undefined) {
      const epoch = new Epoch(this.n);
      const startingSat = epoch.startingSat;
      const startingHeight = epoch.startingHeight;
      this.#startingSat = new Sat(startingSat.n + (this.n - startingHeight.n) * epoch.subsidy);
    }
    return this.#startingSat;
  }

  get periodOffset(): number {
    if (this.#periodOffset === undefined) {
      this.#periodOffset = Math.floor(this.n % DIFFCHANGE_INTERVAL);
    }
    return this.#periodOffset;
  }

  add(n: number): Height {
    return new Height(this.n + n);
  }

  sub(n: number): Height {
    return new Height(this.n - n);
  }

  eq(n: number): boolean {
    return this.n === n;
  }
}
