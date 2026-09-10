import { createHmac } from "node:crypto";

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function signJitsiJwt(input: {
  appId: string;
  secret: string;
  issuer?: string;
  host: string;
  room: string;
  userId: string;
  displayName: string;
  moderator: boolean;
  ttlSec?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", kid: input.appId };
  const payload = {
    aud: input.appId,
    iss: input.issuer?.trim() || input.appId,
    sub: input.host,
    room: input.room,
    nbf: now - 10,
    exp: now + (input.ttlSec ?? 3600),
    context: {
      user: {
        id: input.userId,
        name: input.displayName,
        moderator: input.moderator,
      },
    },
  };
  const body = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", input.secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}
