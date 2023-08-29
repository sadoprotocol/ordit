export function getDeployEvent(data: any): TokenDeployedEvent | undefined {
  if (data.max === undefined) {
    return undefined;
  }
  const dec = data.dec === undefined ? 18 : parseInt(data.dec, 10);
  if (dec > 18) {
    return undefined;
  }
  const event: TokenDeployedEvent = {
    p: "brc-20",
    op: "deploy",
    tick: data.tick.toLowerCase(),
    max: parseInt(data.max, 10),
    dec,
  };
  if (data.lim !== undefined) {
    event.lim = parseInt(data.lim, 10);
  }
  return event;
}

export function getMintEvent(data: any): TokenMintedEvent | undefined {
  if (data.amt === undefined) {
    return undefined;
  }
  return {
    p: "brc-20",
    op: "mint",
    tick: data.tick.toLowerCase(),
    amt: parseInt(data.amt, 10),
  };
}

export function getTransferEvent(data: any): TokenTransferedEvent | undefined {
  if (data.amt === undefined) {
    return undefined;
  }
  return {
    p: "brc-20",
    op: "transfer",
    tick: data.tick.toLowerCase(),
    amt: parseInt(data.amt, 10),
  };
}

type Brc20Token = {
  p: "brc-20";
};

export type TokenDeployedEvent = Brc20Token & {
  op: "deploy";
  tick: string;
  max: number;
  lim?: number;
  dec: number;
};

export type TokenMintedEvent = Brc20Token & {
  op: "mint";
  tick: string;
  amt: number;
};

export type TokenTransferedEvent = Brc20Token & {
  op: "transfer";
  tick: string;
  amt: number;
};
