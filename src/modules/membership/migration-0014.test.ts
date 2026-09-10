import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.resolve(process.cwd(), "drizzle/0014_support_and_membership_validity.sql"),
  "utf8",
);
const preflight = readFileSync(
  path.resolve(process.cwd(), "drizzle/0014_support_and_membership_validity.preflight.sql"),
  "utf8",
);

function factoryWhereClause(source: string) {
  const match = source.match(
    /"id" IN \(\s*'550e8400-e29b-41d4-a716-446655440002',[\s\S]*?interval '5 seconds'/,
  );
  expect(match, "factory WHERE clause").toBeTruthy();
  return match![0].replace(/\s+/g, " ");
}

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

  it("ships a read-only preflight query with the same WHERE as the UPDATE", () => {
    expect(preflight).toMatch(/^\s*-- Read-only/i);
    const uncommented = preflight.replace(/--.*$/gm, "");
    expect(uncommented).not.toMatch(/\b(UPDATE|INSERT|DELETE|ALTER|DROP)\b/i);
    expect(factoryWhereClause(preflight)).toBe(factoryWhereClause(sql));
    expect(sql).not.toMatch(/never saved again/i);
    expect(sql).toMatch(/not proof the row was never edited/i);
  });
});
