import { SadoException } from "./SadoException";

export class OfferValidationFailed extends SadoException {
  constructor(message: string, data?: any) {
    super("OFFER_VALIDATION_FAILED", message, data);
  }
}
