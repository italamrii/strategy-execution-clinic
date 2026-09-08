# Impact Score

Score = Σ (event.value × weight) for non-revoked impact events.

Default weights (configurable in `impact_rules`):

| Event | Weight |
| --- | --- |
| volunteer_hours | 2 |
| approved_contribution | 1 |
| opportunity_completed | 25 |
| leadership_contribution | 50 |

Clients cannot submit scores. Admins configure weights only.
Breakdown surfaces volunteer / contribution / leadership / initiative buckets.
