import { CYCLE_EPOCHS, DIFFCHANGE_INTERVAL, SUBSIDY_HALVING_INTERVAL } from "./Constants";
import { Sat } from "./Sat";

export class Degree {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly third: number;

  constructor(sat: Sat) {
    const height = sat.height.n;
    this.hour = Math.floor(height / (CYCLE_EPOCHS * SUBSIDY_HALVING_INTERVAL));
    this.minute = Math.floor(height % SUBSIDY_HALVING_INTERVAL);
    this.second = Math.floor(height % DIFFCHANGE_INTERVAL);
    this.third = sat.third;
  }

  toString(): string {
    return `${this.hour}°${this.minute}′${this.second}″${this.third}‴`;
  }
}
