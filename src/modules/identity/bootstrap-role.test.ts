import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRole: vi.fn(), findAssignment: vi.fn(), insert: vi.fn(),
  values: vi.fn(), conflict: vi.fn(), audit: vi.fn(), security: vi.fn(),
}));
vi.mock("@/shared/db/client", () => ({ getDb: () => ({
  query: { roles: { findFirst: mocks.findRole }, userRoles: { findFirst: mocks.findAssignment } },
  insert: mocks.insert,
}) }));
vi.mock("@/modules/audit", () => ({ writeAudit: mocks.audit, writeSecurityEvent: mocks.security }));
import { ensureBootstrapSuperAdmin } from "./auth/clerk-sync";

describe("bootstrap assignment executes real helper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("BOOTSTRAP_CONFIRM", "YES");
    vi.stubEnv("BOOTSTRAP_ADMIN_EMAIL", "owner@example.test");
    mocks.findRole.mockResolvedValue({ id: "role-id" });
    mocks.findAssignment.mockResolvedValue(null);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.conflict });
    mocks.conflict.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());
  it("does not grant for a different email", async () => {
    await ensureBootstrapSuperAdmin("user", "other@example.test", null);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not grant when disabled", async () => {
    vi.stubEnv("BOOTSTRAP_CONFIRM", "NO");
    await ensureBootstrapSuperAdmin("user", "owner@example.test", null);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("creates a missing role before assigning it", async () => {
    mocks.findRole.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "new-role" });
    await ensureBootstrapSuperAdmin("user", " OWNER@example.test ", null);
    expect(mocks.conflict).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenLastCalledWith(expect.objectContaining({ userId: "user", roleId: "new-role", organizationId: null }));
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("does not duplicate an existing global assignment", async () => {
    mocks.findAssignment.mockResolvedValue({ id: "assignment" });
    await ensureBootstrapSuperAdmin("user", "owner@example.test", null);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("fails visibly if the role cannot be resolved", async () => {
    mocks.findRole.mockResolvedValue(null);
    await expect(ensureBootstrapSuperAdmin("user", "owner@example.test", null)).rejects.toThrow("bootstrap_role_unavailable");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
