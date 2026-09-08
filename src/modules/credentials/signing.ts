/**
 * Ed25519 signing abstraction for future signed credential payloads.
 * Phase 3 uses authoritative DB verification; signing is optional infrastructure.
 */
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

export type SignedPayload = {
  v: number;
  kid: string;
  code: string;
  status: string;
  issuedAt: string;
  sig: string;
};

export function getSigningKeyId(): string {
  return process.env.CREDENTIAL_SIGNING_KEY_ID ?? "dev-key-1";
}

export function signCredentialPayload(input: {
  publicCode: string;
  status: string;
  issuedAt: string;
}): SignedPayload | null {
  const privateKey = process.env.CREDENTIAL_SIGNING_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  const canonical = JSON.stringify({
    v: 1,
    kid: getSigningKeyId(),
    code: input.publicCode,
    status: input.status,
    issuedAt: input.issuedAt,
  });
  const digest = createHash("sha256").update(canonical).digest();
  const signature = sign(null, digest, {
    key: privateKey,
    format: "pem",
    type: "pkcs8",
  });
  return {
    v: 1,
    kid: getSigningKeyId(),
    code: input.publicCode,
    status: input.status,
    issuedAt: input.issuedAt,
    sig: signature.toString("base64url"),
  };
}

export function verifyCredentialPayload(
  payload: SignedPayload,
  publicKeyPem: string,
): boolean {
  const canonical = JSON.stringify({
    v: payload.v,
    kid: payload.kid,
    code: payload.code,
    status: payload.status,
    issuedAt: payload.issuedAt,
  });
  const digest = createHash("sha256").update(canonical).digest();
  return verify(
    null,
    digest,
    { key: publicKeyPem, format: "pem", type: "spki" },
    Buffer.from(payload.sig, "base64url"),
  );
}

export function generateDevSigningKeyPair(): { publicKey: string; privateKey: string } {
  const pair = generateKeyPairSync("ed25519");
  return {
    publicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}
