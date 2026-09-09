export class MeetingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "MeetingError";
  }
}
