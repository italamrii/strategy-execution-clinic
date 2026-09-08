import "dotenv/config";
import { clearMemoryInbox, getLatestOtpForEmail } from "../src/shared/ports/email";
import { closeDb, resetDb } from "../src/shared/db/client";
import {
  requestLoginOtp,
  resolveSessionByToken,
  revokeSession,
  verifyLoginOtp,
} from "../src/modules/identity";

async function main() {
  const url =
    process.env.DATABASE_URL ??
    "postgres://clinic:clinic@127.0.0.1:54329/clinic";
  process.env.AUTH_SECRET ??= "phase1-local-auth-secret-32chars!!";
  process.env.EMAIL_PROVIDER = "memory";
  await resetDb(url);

  const email = `verify-${Date.now()}@clinic.test`;
  clearMemoryInbox();
  await requestLoginOtp({ email, locale: "ar", ip: "127.0.0.1" });
  const code = getLatestOtpForEmail(email);
  if (!code) {
    throw new Error("OTP was not captured by memory email provider");
  }
  const login = await verifyLoginOtp({ email, code, ip: "127.0.0.1" });
  const session = await resolveSessionByToken(login.token);
  if (!session) {
    throw new Error("session not resolvable after login");
  }
  await revokeSession({
    sessionId: login.sessionId,
    actorUserId: login.userId,
    reason: "script_verify",
  });
  const after = await resolveSessionByToken(login.token);
  if (after) {
    throw new Error("session still valid after revoke");
  }
  console.log("AUTH_SCRIPT_OK", { email, userId: login.userId, sessionId: login.sessionId });
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
