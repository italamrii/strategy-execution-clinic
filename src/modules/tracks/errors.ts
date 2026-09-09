export class TrackError extends Error {
  readonly code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = "TrackError";
    this.code = code;
  }
}
