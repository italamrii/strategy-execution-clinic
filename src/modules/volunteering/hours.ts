export function sumApprovedHours(
  entries: { hours: number; status: "pending" | "approved" | "rejected" }[],
  adjustments: { deltaHours: number }[],
): number {
  const approved = entries
    .filter((entry) => entry.status === "approved")
    .reduce((sum, entry) => sum + entry.hours, 0);
  const deltas = adjustments.reduce((sum, row) => sum + row.deltaHours, 0);
  return Number((approved + deltas).toFixed(2));
}

export function applyHourDecision(input: {
  currentStatus: "pending" | "approved" | "rejected";
  nextStatus: "approved" | "rejected";
}): { currentStatus: "pending" | "approved" | "rejected" } {
  if (input.currentStatus !== "pending") {
    throw new Error("hour entry already decided");
  }
  return { currentStatus: input.nextStatus };
}
