export class RecognitionError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "RecognitionError";
    this.code = code;
  }
}
