export class MembershipError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "MembershipError";
    this.code = code;
  }
}
