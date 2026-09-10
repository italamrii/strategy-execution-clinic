export function shouldEnqueueTransactionalEmail(): boolean {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.E2E === "true"
  ) {
    return true;
  }
  return process.env.EMAIL_PROVIDER === "smtp";
}
