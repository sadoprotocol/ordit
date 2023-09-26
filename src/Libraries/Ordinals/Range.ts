export class Range {
  constructor(readonly first: number, readonly last: number) {}

  get value(): number {
    return this.last - this.first;
  }

  grab(amount: number): [Range, Range?] {
    if (amount >= this.value) {
      return [this];
    }
    const next = new Range(this.first, this.first + amount);
    const prev = new Range(this.first + amount, this.last);
    return [next, prev];
  }

  toArray(): [number, number] {
    return [this.first, this.last];
  }
}
