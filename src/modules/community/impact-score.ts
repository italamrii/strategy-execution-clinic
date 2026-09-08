export type ImpactEvent = {
  kind: string;
  value: number;
  revokedAt: Date | null;
};

export type ImpactRule = {
  eventKind: string;
  weight: number;
  isEnabled: boolean;
};

export function calculateImpactScore(
  events: ImpactEvent[],
  rules: ImpactRule[],
): number {
  const weights = new Map(
    rules.filter((rule) => rule.isEnabled).map((rule) => [rule.eventKind, rule.weight]),
  );
  const total = events
    .filter((event) => event.revokedAt === null)
    .reduce((sum, event) => {
      const weight = weights.get(event.kind) ?? 0;
      return sum + event.value * weight;
    }, 0);
  return Math.round(total);
}
