const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomSuffix(length: number, bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD[bytes[i]! % CROCKFORD.length];
  }
  return out;
}

export function generatePublicMembershipCode(input: {
  typeCode: string;
  year: number;
  entropy: Uint8Array;
}): string {
  const type = input.typeCode.replace(/[^A-Z]/g, "").toUpperCase().slice(0, 4);
  if (type.length < 2 || input.entropy.length < 6) {
    throw new Error("invalid public code inputs");
  }
  return `SEC-${type}-${input.year}-${randomSuffix(6, input.entropy)}`;
}

export function isValidPublicCodeFormat(code: string): boolean {
  return /^SEC-[A-Z]{2,4}-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/.test(code);
}

export function isSequentialLookingCode(code: string): boolean {
  return /SEC-[A-Z]{2,4}-\d{4}-\d{4}$/.test(code);
}
