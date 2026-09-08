const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function suffix(bytes: Uint8Array, length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD[bytes[i]! % CROCKFORD.length];
  }
  return out;
}

export function generateRecognitionPublicCode(input: {
  prefix: "BDG" | "CRT";
  year: number;
  entropy: Uint8Array;
}): string {
  if (input.entropy.length < 6) throw new Error("invalid entropy");
  return `SEC-${input.prefix}-${input.year}-${suffix(input.entropy, 6)}`;
}

export function isValidRecognitionCode(code: string, prefix: "BDG" | "CRT"): boolean {
  return new RegExp(`^SEC-${prefix}-\\d{4}-[0-9A-HJKMNP-TV-Z]{6}$`).test(code);
}
