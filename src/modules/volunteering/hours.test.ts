import { describe, expect, it } from "vitest";
import { applyHourDecision, sumApprovedHours } from "./hours";

describe("volunteer hour ledger", () => {
  it("does not let a second decision overwrite an approved entry", () => {
    expect(() =>
      applyHourDecision({ currentStatus: "approved", nextStatus: "approved" }),
    ).toThrow("hour entry already decided");
  });

  it("does not duplicate hours when summing approved entries plus adjustments", () => {
    const total = sumApprovedHours(
      [
        { hours: 8, status: "approved" },
        { hours: 8, status: "approved" },
        { hours: 4, status: "pending" },
        { hours: 2, status: "rejected" },
      ],
      [{ deltaHours: -2 }],
    );
    expect(total).toBe(14);
  });
});
