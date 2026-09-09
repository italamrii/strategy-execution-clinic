export class ConsultationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ConsultationError";
  }
}
