export function getDeployEvent(data: any): TokenDeployedEvent | undefined {
  if (data.max === undefined) {
    return undefined;
  }

  const max = parseInt(data.max, 10);
  if (isNaN(max)) {
    return undefined;
  }

  let dec = 18;
  if (data.dec !== undefined) {
    const value = parseInt(data.dec, 10);
    if (isNaN(value)) {
      return undefined;
    }
    dec = value;
  }

  const event: TokenDeployedEvent = {
    p: "brc-20",
    op: "deploy",
    token: data.tick,
    tick: encodeTick(data.tick),
    max,
    dec,
  };
  if (data.lim !== undefined) {
    const lim = parseInt(data.lim, 10);
    if (isNaN(lim)) {
      return undefined;
    }
    event.lim = lim;
  }
  return event;
}

export function getMintEvent(data: any): TokenMintedEvent | undefined {
  if (data.amt === undefined) {
    return undefined;
  }
  const amt = parseInt(data.amt, 10);
  if (isNaN(amt)) {
    return undefined;
  }
  return {
    p: "brc-20",
    op: "mint",
    token: data.tick,
    tick: encodeTick(data.tick),
    amt,
  };
}

export function getTransferEvent(data: any): TokenTransferedEvent | undefined {
  if (data.amt === undefined) {
    return undefined;
  }
  const amt = parseInt(data.amt, 10);
  if (isNaN(amt)) {
    return undefined;
  }
  return {
    p: "brc-20",
    op: "transfer",
    token: data.tick,
    tick: encodeTick(data.tick),
    amt,
  };
}

export function encodeTick(tick: string) {
  return tick.replace(/\./g, "[dot]").replace(/\$/g, "[dollar]").toLocaleLowerCase();
}

export function decodeTick(tick: string) {
  return tick.replace(/\[dollar\]/g, "$").replace(/\[dot\]/g, ".");
}

export type Brc20Event = TokenDeployedEvent | TokenMintedEvent | TokenTransferedEvent;

export type TokenDeployedEvent = Brc20Token & {
  op: "deploy";
  token: string;
  tick: string;
  max: number;
  lim?: number;
  dec: number;
};

export type TokenMintedEvent = Brc20Token & {
  op: "mint";
  token: string;
  tick: string;
  amt: number;
};

export type TokenTransferedEvent = Brc20Token & {
  op: "transfer";
  token: string;
  tick: string;
  amt: number;
};

type Brc20Token = {
  p: "brc-20";
};
