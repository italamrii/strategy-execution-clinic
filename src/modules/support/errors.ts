export class SupportError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "SupportError";
    this.code = code;
  }
}
