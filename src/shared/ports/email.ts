import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { isProductionRuntime, resolveAppEnvironment } from "@/shared/config/runtime";

export type EmailMessage = {
  to: string;
  locale: "ar" | "en";
  template: string;
  variables: Record<string, string>;
  subject?: string;
  html?: string;
  text?: string;
};

export type EmailProvider = {
  send(message: EmailMessage): Promise<void>;
};

function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

type CapturedMessage = EmailMessage & { sentAt: string };

const memoryInbox: CapturedMessage[] = [];
const capturePath = path.resolve(process.cwd(), ".data", "otp-capture.json");
const emailCapturePath = path.resolve(process.cwd(), ".data", "email-capture.json");
const localOtpCapturePath = path.resolve(process.cwd(), ".data", "local-otp-capture.json");

async function persistLocalOtpCapture(message: EmailMessage): Promise<void> {
  if (
    resolveAppEnvironment() !== "local" ||
    process.env.AUTH_DEV_LOG_OTP !== "true" ||
    message.template !== "auth.otp" ||
    !message.variables.code
  ) return;
  await mkdir(path.dirname(localOtpCapturePath), { recursive: true });
  await writeFile(localOtpCapturePath, JSON.stringify({
    email: message.to.trim().toLowerCase(),
    code: message.variables.code,
    sentAt: new Date().toISOString(),
  }), "utf8");
}

async function persistOtpCapture(message: EmailMessage): Promise<void> {
  if (
    process.env.ENABLE_TEST_OTP_ENDPOINT !== "true" ||
    process.env.E2E !== "true" ||
    message.template !== "auth.otp" ||
    !message.variables.code
  ) {
    return;
  }
  await mkdir(path.dirname(capturePath), { recursive: true });
  let current: Record<string, { code: string; sentAt: string }> = {};
  try {
    current = JSON.parse(await readFile(capturePath, "utf8")) as typeof current;
  } catch {
    current = {};
  }
  current[message.to.trim().toLowerCase()] = {
    code: message.variables.code,
    sentAt: new Date().toISOString(),
  };
  await writeFile(capturePath, JSON.stringify(current, null, 2), "utf8");
}

async function persistEmailCapture(message: CapturedMessage): Promise<void> {
  if (process.env.EMAIL_CAPTURE !== "true" && process.env.E2E !== "true") {
    return;
  }
  await mkdir(path.dirname(emailCapturePath), { recursive: true });
  let current: CapturedMessage[] = [];
  try {
    current = JSON.parse(await readFile(emailCapturePath, "utf8")) as CapturedMessage[];
  } catch {
    current = [];
  }
  current.push(message);
  await writeFile(emailCapturePath, JSON.stringify(current.slice(-200), null, 2), "utf8");
}

export function clearMemoryInbox(): void {
  memoryInbox.length = 0;
}

export function getMemoryInbox(): readonly CapturedMessage[] {
  return memoryInbox;
}

export function getLatestOtpForEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  for (let i = memoryInbox.length - 1; i >= 0; i -= 1) {
    const item = memoryInbox[i];
    if (item.to === normalized && item.template === "auth.otp" && item.variables.code) {
      return item.variables.code;
    }
  }
  return null;
}

export async function getCapturedOtpForEmail(email: string): Promise<string | null> {
  const fromMemory = getLatestOtpForEmail(email);
  if (fromMemory) {
    return fromMemory;
  }
  try {
    const current = JSON.parse(await readFile(capturePath, "utf8")) as Record<
      string,
      { code: string }
    >;
    return current[email.trim().toLowerCase()]?.code ?? null;
  } catch {
    return null;
  }
}

export async function getCapturedEmails(): Promise<CapturedMessage[]> {
  try {
    return JSON.parse(await readFile(emailCapturePath, "utf8")) as CapturedMessage[];
  } catch {
    return [...memoryInbox];
  }
}

export const memoryEmailProvider: EmailProvider = {
  async send(message) {
    const normalized = {
      ...message,
      to: message.to.trim().toLowerCase(),
      sentAt: new Date().toISOString(),
    };
    memoryInbox.push(normalized);
    await persistOtpCapture(normalized);
    await persistEmailCapture(normalized);
  },
};

/**
 * Development adapter. Does not verify production email delivery.
 * Never logs OTP unless AUTH_DEV_LOG_OTP=true.
 */
export const consoleEmailProvider: EmailProvider = {
  async send(message) {
    const payload: Record<string, unknown> = {
      adapter: "console",
      to: message.to,
      template: message.template,
      locale: message.locale,
      note: "console adapter is not production email delivery",
    };
    if (process.env.AUTH_DEV_LOG_OTP === "true" && message.variables.code) {
      payload.devOtp = message.variables.code;
    }
    console.info("email.console", payload);
    await memoryEmailProvider.send(message);
    await persistLocalOtpCapture(message);
  },
};

function encodeSmtpData(data: string): string {
  return data.replace(/\r?\n/g, "\r\n");
}

async function smtpCommand(socket: net.Socket, command: string): Promise<string> {
  socket.write(`${command}\r\n`);
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      socket.off("error", onError);
      resolve(chunk.toString("utf8"));
    };
    const onError = (error: Error) => {
      socket.off("data", onData);
      reject(error);
    };
    socket.once("data", onData);
    socket.once("error", onError);
  });
}

/**
 * Minimal SMTP adapter for controlled test/production SMTP servers.
 * Requires SMTP_HOST, SMTP_PORT, SMTP_FROM. Optional SMTP_USER/SMTP_PASS.
 */
export const smtpEmailProvider: EmailProvider = {
  async send(message) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new Error("smtp_not_configured");
    }
    const to = sanitizeEmailHeader(message.to);
    const subject = sanitizeEmailHeader(message.subject ?? message.template);
    const body = message.html ?? message.text ?? JSON.stringify(message.variables);
    const socket = net.createConnection({ host, port });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("error", reject);
    });
    await smtpCommand(socket, "");
    await smtpCommand(socket, `EHLO clinic.local`);
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await smtpCommand(socket, "AUTH LOGIN");
      await smtpCommand(socket, Buffer.from(process.env.SMTP_USER).toString("base64"));
      await smtpCommand(socket, Buffer.from(process.env.SMTP_PASS).toString("base64"));
    }
    await smtpCommand(socket, `MAIL FROM:<${sanitizeEmailHeader(from)}>`);
    await smtpCommand(socket, `RCPT TO:<${to}>`);
    await smtpCommand(socket, "DATA");
    const mime = encodeSmtpData(
      [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        message.html ? 'Content-Type: text/html; charset="UTF-8"' : 'Content-Type: text/plain; charset="UTF-8"',
        "",
        body,
        ".",
      ].join("\r\n"),
    );
    await smtpCommand(socket, mime);
    await smtpCommand(socket, "QUIT");
    socket.end();
    await memoryEmailProvider.send(message);
  },
};

export function getEmailProvider(): EmailProvider {
  const mode = process.env.EMAIL_PROVIDER ?? "console";
  if (isProductionRuntime() && (mode === "memory" || mode === "console")) {
    throw new Error(`EMAIL_PROVIDER=${mode} is not allowed in production`);
  }
  if (mode === "memory") {
    return memoryEmailProvider;
  }
  if (mode === "smtp") {
    return smtpEmailProvider;
  }
  return consoleEmailProvider;
}
