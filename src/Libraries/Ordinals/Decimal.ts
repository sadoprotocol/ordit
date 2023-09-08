import { Height } from "./Height";
import { Sat } from "./Sat";

export class Decimal {
  constructor(readonly height: Height, readonly offset: number) {}

  static from(sat: Sat): Decimal {
    return new Decimal(sat.height, sat.third);
  }

  toString(): string {
    return `${this.height.n}.${this.offset}`;
  }
}
