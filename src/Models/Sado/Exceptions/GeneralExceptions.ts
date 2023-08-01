import { SadoException } from "./SadoException";

export class IPFSLookupFailed extends SadoException {
  constructor(txid: string, message: string, data: any = {}) {
    super("IPFS_LOOKUP_FAILED", message, {
      ...data,
      txid,
    });
  }
}
