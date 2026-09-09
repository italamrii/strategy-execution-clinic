export {
  AuthorizationError,
  assertCanApproveMembershipApplication,
  assertCanIssueMembership,
  assertCanReviewHours,
  assertCanReviewMembershipApplication,
  assertNotSelfApplicationReview,
  assertPermission,
  ignoreClientRoleEscalation,
} from "@/shared/security/authorization";
export type { Actor } from "@/shared/security/authorization";

export { requestLoginOtp, verifyLoginOtp, AuthError } from "./auth/service";
export {
  syncClerkIdentityToLocalUser,
  planClerkUserMapping,
  ClerkMappingError,
} from "./auth/clerk-sync";
export type { ClerkIdentity, LocalUserRecord, MappingPlan } from "./auth/clerk-sync";
export { bootstrapSuperAdmin } from "./bootstrap";
export {
  getPrivateAccount,
  updateOwnProfile,
  updateLocale,
  toPublicProfileDto,
  publicProfileLeaksPrivate,
} from "./profile/service";
export type { PublicProfileDto, PrivateAccountDto } from "./profile/service";
export {
  requirePermission,
  requireAnyPermission,
  requireRole,
  assignRole,
  seedRbacCatalog,
  getPermissionsForUser,
  getRolesForUser,
  buildActor,
} from "./rbac/service";
export {
  requireAuthenticatedUser,
  requireAuthenticatedPermission,
  getOptionalAuthContext,
} from "./session/context";
export type { AuthContext } from "./session/context";
export {
  createSession,
  resolveSessionByToken,
  revokeSession,
  revokeAllSessionsForUser,
  listSessionsForUser,
} from "./session/service";
export {
  setSessionCookie,
  clearSessionCookie,
  readSessionToken,
} from "./session/cookie";
export { RateLimitError, consumeRateLimit } from "./rate-limit";
export { SESSION_COOKIE_NAME, SESSION_IDLE_MS, SESSION_TTL_MS } from "./constants";
