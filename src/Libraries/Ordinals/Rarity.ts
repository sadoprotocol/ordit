import { Sat } from "./Sat";

export class Rarity {
  static readonly Common = 0;
  static readonly Uncommon = 1;
  static readonly Rare = 2;
  static readonly Epic = 3;
  static readonly Legendary = 4;
  static readonly Mythic = 5;

  constructor(readonly n: number) {}

  static from(sat: Sat): Rarity {
    const { hour, minute, second, third } = sat.degree;
    if (hour === 0 && minute === 0 && second === 0 && third === 0) {
      return new Rarity(Rarity.Mythic);
    }
    if (minute === 0 && second === 0 && third === 0) {
      return new Rarity(Rarity.Legendary);
    }
    if (minute === 0 && third === 0) {
      return new Rarity(Rarity.Epic);
    }
    if (second === 0 && third === 0) {
      return new Rarity(Rarity.Rare);
    }
    if (third === 0) {
      return new Rarity(Rarity.Uncommon);
    }
    return new Rarity(Rarity.Common);
  }

  toString() {
    switch (this.n) {
      case Rarity.Common: {
        return "common";
      }
      case Rarity.Uncommon: {
        return "uncommon";
      }
      case Rarity.Rare: {
        return "rare";
      }
      case Rarity.Epic: {
        return "epic";
      }
      case Rarity.Legendary: {
        return "legendary";
      }
      case Rarity.Mythic: {
        return "mythic";
      }
    }
  }
}
