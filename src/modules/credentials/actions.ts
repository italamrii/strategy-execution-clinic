"use server";

import { headers } from "next/headers";
import { requireAuthenticatedPermission } from "@/modules/identity";
import { AuthorizationError } from "@/shared/security/authorization";
import { CredentialError } from "./errors";
import {
  adminIssueCredential,
  adminRevokeCredential,
  adminSuspendCredential,
} from "./service";

export type CredentialActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string };

async function requestId() {
  const h = await headers();
  return h.get("x-request-id");
}

function mapError(error: unknown): CredentialActionResult {
  if (error instanceof CredentialError) {
    return { ok: false, code: error.code };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, code: "forbidden" };
  }
  throw error;
}

export async function adminIssueCredentialAction(input: {
  membershipId: string;
  reason: string;
}): Promise<CredentialActionResult> {
  if (!input.reason.trim()) return { ok: false, code: "reason_required" };
  try {
    const auth = await requireAuthenticatedPermission("credential.issue");
    const id = await adminIssueCredential({
      actorUserId: auth.userId,
      membershipId: input.membershipId,
      reason: input.reason,
      requestId: await requestId(),
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function adminSuspendCredentialAction(input: {
  credentialId: string;
  reason: string;
}): Promise<CredentialActionResult> {
  if (!input.reason.trim()) return { ok: false, code: "reason_required" };
  try {
    const auth = await requireAuthenticatedPermission("credential.suspend");
    const id = await adminSuspendCredential({
      actorUserId: auth.userId,
      credentialId: input.credentialId,
      reason: input.reason,
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}

export async function adminRevokeCredentialAction(input: {
  credentialId: string;
  reason: string;
}): Promise<CredentialActionResult> {
  if (!input.reason.trim()) return { ok: false, code: "reason_required" };
  try {
    const auth = await requireAuthenticatedPermission("credential.revoke");
    const id = await adminRevokeCredential({
      actorUserId: auth.userId,
      credentialId: input.credentialId,
      reason: input.reason,
    });
    return { ok: true, id };
  } catch (error) {
    return mapError(error);
  }
}
