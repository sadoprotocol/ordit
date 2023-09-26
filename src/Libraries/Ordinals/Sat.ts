import { CYCLE_EPOCHS, DIFFCHANGE_INTERVAL } from "./Constants";
import { Decimal } from "./Decimal";
import { Degree } from "./Degree";
import { Epoch } from "./Epoch";
import { Height } from "./Height";
import { Rarity } from "./Rarity";

export const SAT_SUPPLY = 2_099_999_997_690_000;
export const LAST_SAT = SAT_SUPPLY - 1;

export class Sat {
  #height?: Height;
  #cycle?: number;
  #percentile?: string;
  #degree?: Degree;
  #third?: number;
  #epoch?: Epoch;
  #period?: number;
  #rarity?: Rarity;
  #epochPosition?: number;
  #decimal?: Decimal;
  #name?: string;

  constructor(readonly n: number) {}

  static fromName(name: string): Sat {
    let x = 0;
    for (const c of name) {
      if (c >= "a" && c <= "z") {
        x = x * 26 + c.charCodeAt(0) - "a".charCodeAt(0) + 1;
      } else {
        throw new Error(`invalid character in sat name: ${c}`);
      }
    }
    if (x > SAT_SUPPLY) {
      throw new Error("sat name out of range");
    }
    return new Sat(SAT_SUPPLY - x);
  }

  get height(): Height {
    if (this.#height === undefined) {
      this.#height = new Height(Math.floor(this.epoch.startingHeight.n + this.epochPosition / this.epoch.subsidy));
    }
    return this.#height;
  }

  get cycle(): number {
    if (this.#cycle === undefined) {
      this.#cycle = Math.floor(this.epoch.n / CYCLE_EPOCHS);
    }
    return this.#cycle;
  }

  get percentile(): string {
    if (this.#percentile === undefined) {
      this.#percentile = `${(this.n / LAST_SAT) * 100}%`;
    }
    return this.#percentile;
  }

  get degree(): Degree {
    if (this.#degree === undefined) {
      this.#degree = new Degree(this);
    }
    return this.#degree;
  }

  get third(): number {
    if (this.#third === undefined) {
      this.#third = Math.floor(this.epochPosition % this.epoch.subsidy);
    }
    return this.#third;
  }

  get epoch(): Epoch {
    if (this.#epoch === undefined) {
      this.#epoch = Epoch.from(this);
    }
    return this.#epoch;
  }

  get period(): number {
    if (this.#period === undefined) {
      this.#period = Math.floor(this.height.n / DIFFCHANGE_INTERVAL);
    }
    return this.#period;
  }

  get rarity(): Rarity {
    if (this.#rarity === undefined) {
      this.#rarity = Rarity.from(this);
    }
    return this.#rarity;
  }

  get epochPosition(): number {
    if (this.#epochPosition === undefined) {
      this.#epochPosition = Math.floor(this.n - this.epoch.startingSat.n);
    }
    return this.#epochPosition;
  }

  get decimal(): Decimal {
    if (this.#decimal === undefined) {
      this.#decimal = Decimal.from(this);
    }
    return this.#decimal;
  }

  get name(): string {
    if (this.#name === undefined) {
      let x = SAT_SUPPLY - this.n;
      let name = "";
      while (x > 0) {
        name += "abcdefghijklmnopqrstuvwxyz".charAt((x - 1) % 26);
        x = Math.floor((x - 1) / 26);
      }
      this.#name = name.split("").reverse().join("");
    }
    return this.#name;
  }

  toJSON() {
    return {
      number: this.n,
      decimal: this.decimal.toString(),
      degree: this.degree.toString(),
      name: this.name,
      block: this.height.n,
      cycle: this.cycle,
      epoch: this.epoch.n,
      period: this.period,
      offset: this.third,
      rarity: this.rarity.toString(),
      percentile: this.percentile,
    };
  }
}

export const STARTING_SATS = [
  new Sat(0),
  new Sat(1050000000000000),
  new Sat(1575000000000000),
  new Sat(1837500000000000),
  new Sat(1968750000000000),
  new Sat(2034375000000000),
  new Sat(2067187500000000),
  new Sat(2083593750000000),
  new Sat(2091796875000000),
  new Sat(2095898437500000),
  new Sat(2097949218750000),
  new Sat(2098974609270000),
  new Sat(2099487304530000),
  new Sat(2099743652160000),
  new Sat(2099871825870000),
  new Sat(2099935912620000),
  new Sat(2099967955890000),
  new Sat(2099983977420000),
  new Sat(2099991988080000),
  new Sat(2099995993410000),
  new Sat(2099997995970000),
  new Sat(2099998997250000),
  new Sat(2099999497890000),
  new Sat(2099999748210000),
  new Sat(2099999873370000),
  new Sat(2099999935950000),
  new Sat(2099999967240000),
  new Sat(2099999982780000),
  new Sat(2099999990550000),
  new Sat(2099999994330000),
  new Sat(2099999996220000),
  new Sat(2099999997060000),
  new Sat(2099999997480000),
  new Sat(SAT_SUPPLY),
];
