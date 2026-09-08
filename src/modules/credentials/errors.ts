export class CredentialError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "CredentialError";
    this.code = code;
  }
}
