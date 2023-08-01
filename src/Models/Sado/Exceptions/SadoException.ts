export abstract class SadoException {
  constructor(readonly code: string, readonly message: string, readonly data: any = {}) {}
}
