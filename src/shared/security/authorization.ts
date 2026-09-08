export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN" as const;

  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type Actor = {
  id: string;
  permissions: readonly string[];
};

export function hasPermission(actor: Actor, permission: string): boolean {
  return actor.permissions.includes(permission);
}

export function assertPermission(actor: Actor, permission: string): void {
  if (!hasPermission(actor, permission)) {
    throw new AuthorizationError("forbidden");
  }
}

/** Non-negotiable: reviewers cannot act on their own membership application. */
export function assertNotSelfApplicationReview(
  actor: Actor,
  application: { userId: string },
): void {
  if (actor.id === application.userId) {
    throw new AuthorizationError("member cannot approve own application");
  }
}

export function assertCanReviewMembershipApplication(
  actor: Actor,
  application: { userId: string },
): void {
  assertPermission(actor, "membership.application.review");
  assertNotSelfApplicationReview(actor, application);
}

export function assertCanApproveMembershipApplication(
  actor: Actor,
  application: { userId: string },
): void {
  assertPermission(actor, "membership.application.approve");
  assertNotSelfApplicationReview(actor, application);
}

export function assertCanIssueMembership(actor: Actor): void {
  assertPermission(actor, "membership.issue");
}

export function assertCanReviewHours(
  actor: Actor,
  entry: { userId: string },
): void {
  assertPermission(actor, "volunteer.hours.review");
  if (actor.id === entry.userId) {
    throw new AuthorizationError("volunteer cannot approve own hours");
  }
}

export function ignoreClientRoleEscalation<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "role" | "roleId"> {
  const rest = { ...body };
  delete rest.role;
  delete rest.roleId;
  return rest as Omit<T, "role" | "roleId">;
}
