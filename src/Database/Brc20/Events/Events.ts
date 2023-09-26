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
    tick: data.tick,
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
    tick: data.tick,
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
    tick: data.tick,
    amt,
  };
}

export type TokenEvent = TokenDeployedEvent | TokenMintedEvent | TokenTransferedEvent;

export type TokenDeployedEvent = {
  p: "brc-20";
  op: "deploy";
  tick: string;
  max: number;
  lim?: number;
  dec: number;
};

export type TokenMintedEvent = {
  p: "brc-20";
  op: "mint";
  tick: string;
  amt: number;
};

export type TokenTransferedEvent = {
  p: "brc-20";
  op: "transfer";
  tick: string;
  amt: number;
};
