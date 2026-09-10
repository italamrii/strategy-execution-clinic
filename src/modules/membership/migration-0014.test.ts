import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.resolve(process.cwd(), "drizzle/0014_support_and_membership_validity.sql"),
  "utf8",
);

describe("migration 0014 membership validity", () => {
  it("updates only verified 0011 factory default rows", () => {
    expect(sql).toContain("550e8400-e29b-41d4-a716-446655440002");
    expect(sql).toContain("550e8400-e29b-41d4-a716-446655440007");
    expect(sql).toContain("AND \"validity_mode\" = 'lifetime'");
    expect(sql).toContain("AND \"validity_days\" IS NULL");
    expect(sql).toContain("AND \"renewal_required\" = false");
    expect(sql).toContain("AND \"updated_at\" <= \"created_at\" + interval '5 seconds'");
  });

  it("does not rewrite lifetime founding, partner, or institutional factory rows", () => {
    const updateBlock = sql.slice(sql.indexOf("UPDATE \"membership_types\""));
    expect(updateBlock).not.toContain("550e8400-e29b-41d4-a716-446655440001");
    expect(updateBlock).not.toContain("550e8400-e29b-41d4-a716-446655440008");
    expect(updateBlock).not.toContain("550e8400-e29b-41d4-a716-446655440009");
  });
});
