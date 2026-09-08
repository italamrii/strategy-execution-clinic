import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const { stop, remove } = vi.hoisted(() => ({ stop: vi.fn(), remove: vi.fn() }));
vi.mock("node:fs/promises", () => ({ rm: remove }));

// The mock uses a prototype method so super.stop() follows the real library API.
vi.mock("embedded-postgres", () => ({
  default: class {
    constructor(protected options: Record<string, unknown>) {}
    stop() { return stop(); }
  },
}));
import TestPostgres from "./embedded-postgres";

beforeEach(() => { vi.resetAllMocks(); });

describe("test database cleanup", () => {
  const databaseDir = path.resolve(".data", "pg-cleanup-test");

  it("retries a transient Windows directory lock after shutdown", async () => {
    stop.mockRejectedValue(Object.assign(new Error("locked"), { code: "EBUSY" }));
    await new TestPostgres({ databaseDir, persistent: false }).stop();
    expect(remove).toHaveBeenCalledWith(databaseDir, {
      recursive: true, force: true, maxRetries: 10, retryDelay: 200,
    });
  });

  it("does not delete a persistent database", async () => {
    const error = Object.assign(new Error("locked"), { code: "EBUSY" });
    stop.mockRejectedValue(error);
    await expect(new TestPostgres({ databaseDir, persistent: true }).stop()).rejects.toBe(error);
    expect(remove).not.toHaveBeenCalled();
  });

  it("preserves shutdown failures that are not file locks", async () => {
    const error = new Error("shutdown failed");
    stop.mockRejectedValue(error);
    await expect(new TestPostgres({ databaseDir, persistent: false }).stop()).rejects.toBe(error);
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([path.resolve(".data"), path.resolve("..", "outside")])(
    "rejects cleanup outside a child test directory: %s", async (unsafeDir) => {
      await expect(new TestPostgres({ databaseDir: unsafeDir, persistent: false }).stop()).rejects.toThrow("inside");
      expect(stop).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    },
  );
});
