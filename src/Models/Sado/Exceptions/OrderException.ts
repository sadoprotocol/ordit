import { SadoException } from "./SadoException";

export class OrderTransactionNotFound extends SadoException {
  /**
   * @param cid      - Order CID missing a valid transaction.
   * @param location - Location of the transaction that is missing.
   */
  constructor(location: string) {
    super("ORDER_TRANSACTION_NOT_FOUND", `Transaction at location ${location} does not exist`);
  }
}

export class OrderSignatureInvalid extends SadoException {
  constructor(message: string) {
    super("ORDER_SIGNATURE_INVALID", message);
  }
}

export class OrderVoutNotFound extends SadoException {
  /**
   * @param cid      - Order CID missing a valid vout.
   * @param location - Location of the transaction with missing vout.
   */
  constructor(location: string) {
    super("ORDER_VOUT_NOT_FOUND", `Transaction vout at location ${location} does not exist`);
  }
}

export class OrderInvalidMaker extends SadoException {
  /**
   * @param cid      - Order CID containing invalid owner.
   * @param location - Location of the transaction.
   */
  constructor(location: string) {
    super("ORDER_INVALID_MAKER", `Transaction at location ${location} is not owned by order maker`);
  }
}

export class OrderClosed extends SadoException {
  constructor() {
    super("ORDER_CLOSED", "Order has been closed");
  }
}

export class OrderFulfilledException extends SadoException {
  constructor() {
    super("ORDER_FULFILLED", "Order was fulfilled by another offer");
  }
}

export class OrdinalsTransactedExternally extends SadoException {
  constructor(txid: string) {
    super("ORDINALS_TRANSACTED_EXTERNALLY", "Ordinal transacted to external recipients", { txid });
  }
}
