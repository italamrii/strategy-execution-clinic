import { describe, expect, it } from "vitest";
import { shouldEnqueueTransactionalEmail } from "./email-gate";

describe("transactional email gate", () => {
  it("allows email in test environments", () => {
    expect(shouldEnqueueTransactionalEmail()).toBe(true);
  });
});
