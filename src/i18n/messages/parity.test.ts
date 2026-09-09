import { describe, expect, it } from "vitest";
import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    keysOf(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation parity", () => {
  it("keeps Arabic and English message keys aligned", () => {
    expect(keysOf(ar).sort()).toEqual(keysOf(en).sort());
  });

  it("includes professional access-denied copy", () => {
    expect(en.access.forbiddenTitle).toMatch(/access/i);
    expect(ar.access.forbiddenTitle.length).toBeGreaterThan(4);
    expect(en.access.signOut).toBeTruthy();
    expect(ar.access.signIn).toBeTruthy();
    expect(en.adminNav.meetings).toBeTruthy();
    expect(ar.adminNav.meetings).toBeTruthy();
  });
});
