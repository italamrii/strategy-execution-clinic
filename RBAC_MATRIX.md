# RBAC Matrix — Strategy & Execution Clinic

Authorization is **server-side** and **permission-based**. UI hiding is not a control.

Roles are configurable records. The slugs below are **system seed roles**. New roles can be composed from permissions without code changes. New *permissions* require a code deploy because each permission is a checked string in services.

Organization-scoped roles: `user_roles.organization_id` is nullable. V1 uses `null` (platform scope).

---

## 1. Seed roles

| Slug | Arabic | Purpose |
| --- | --- | --- |
| `super_admin` | مدير أعلى | Break-glass, security settings, role grants |
| `platform_admin` | مدير المنصة | Operate flags, catalog, most admin |
| `membership_admin` | مدير العضوية | Applications, issuance, types |
| `volunteer_admin` | مدير التطوع | Opportunities, hours, volunteer catalog |
| `track_lead` | قائد مسار | Track-scoped review (future object scope) |
| Volunteer Leader | قائد متطوعين | Opportunity ops, hour review **only for opportunities they organize** |
| `reviewer` | مراجع | Hour/application review as assigned |
| `content_manager` | مدير محتوى | Editorial content |
| `partner_manager` | مدير الشراكات | Partners/org records |
| `auditor` | مدقق | Read audit and reports; no mutations |
| `member` | عضو | Authenticated member default |

`member` is the default authenticated role after account creation. It does **not** imply an approved Clinic membership.

---

## 2. Permission catalog (V1+)

Prefix convention: `domain.resource.action`.

### Identity / security

| Permission | super | platform | auditor | member |
| --- | --- | --- | --- | --- |
| `identity.session.revoke_any` | ✓ | | | |
| `identity.user.disable` | ✓ | ✓ | | |
| `rbac.role.grant` | ✓ | | | |
| `rbac.role.read` | ✓ | ✓ | ✓ | |
| `security.settings.write` | ✓ | | | |
| `security.events.read` | ✓ | ✓ | ✓ | |

### Membership

| Permission | super | platform | membership_admin | reviewer | member |
| --- | --- | --- | --- | --- | --- |
| `membership.type.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `membership.type.manage` | ✓ | ✓ | ✓ | | |
| `membership.track.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `membership.track.manage` | ✓ | ✓ | ✓ | | |
| `membership.application.create` | | | | | ✓ |
| `membership.application.read.own` | | | | | ✓ |
| `membership.application.withdraw.own` | | | | | ✓ |
| `membership.application.read.any` | ✓ | ✓ | ✓ | ✓ | |
| `membership.application.review` | ✓ | ✓ | ✓ | ✓ | **never own** |
| `membership.application.assign` | ✓ | ✓ | ✓ | | |
| `membership.application.approve` | ✓ | ✓ | ✓ | ✓ | **never own** |
| `membership.application.reject` | ✓ | ✓ | ✓ | ✓ | **never own** |
| `membership.read.own` | | | | | ✓ |
| `membership.read.any` | ✓ | ✓ | ✓ | | |
| `membership.issue` | ✓ | ✓ | ✓ | | |
| `membership.suspend` | ✓ | ✓ | ✓ | | |
| `membership.revoke` | ✓ | ✓ | ✓ | | |

### Credentials

| Permission | super | platform | membership_admin | member |
| --- | --- | --- | --- | --- |
| `credential.verify_public` | unauthenticated allowed | | | |
| `credential.render` | ✓ | ✓ | ✓ | own only via service |
| `credential.revoke` | ✓ | ✓ | ✓ | |

### Volunteering (Phase 4)

| Permission | volunteer_admin | volunteer_leader | reviewer | member |
| --- | --- | --- | --- | --- |
| `volunteer.profile.read.own` / `update.own` | | | | ✓ |
| `volunteer.profile.read.any` | ✓ | | | |
| `volunteer.opportunity.read` | ✓ | ✓ | | ✓ |
| `volunteer.opportunity.create` / `update` / `manage` | ✓ | create/update | | |
| `volunteer.application.create` / `read.own` / `withdraw.own` | | | | ✓ |
| `volunteer.application.read.any` / `review` / `accept` / `reject` | ✓ | review (scoped) | review | **never own** |
| `volunteer.participation.read.own` | | | | ✓ |
| `volunteer.participation.read.any` / `manage` | ✓ | scoped | | |
| `volunteer.attendance.record` | ✓ | ✓ | | **not self** |
| `volunteer.hours.create.own` / `read.own` | | | | ✓ |
| `volunteer.hours.read.any` / `review` | ✓ | review | review | **never self** |
| `volunteer.hours.adjust` | ✓ | | | |
| `volunteer.progression.read` | ✓ | | | ✓ |
| `volunteer.progression.manage` | ✓ | | | |
| `volunteer.impact.read.own` / `read.any` | any | | | own |

Invariants: no self-approval of hours or applications; capacity acceptance uses row locking; adjustments never produce negative totals.

### Recognition (Phase 5)

| Permission | typical holder |
| --- | --- |
| `contribution.create.own` / `read.own` | member |
| `contribution.read.any` / `review` / `approve` / `reject` | reviewer, platform_admin |
| `contribution.revoke` | platform_admin |
| `badge.read.own` | member |
| `badge.issue` / `badge.revoke` / `badge.definition.manage` | platform_admin |
| `certificate.read.own` / `read.any` | member / admin |
| `certificate.issue` / `revoke` / `definition.manage` | platform_admin |
| `impact.read.own` / `read.any` / `impact.config.manage` | member / admin |
| `directory.profile.manage.own` | member |

Hard invariant: a badge award never grants RBAC. Volunteer Leader **badge** ≠ `volunteer_leader` role.

Volunteer Leader object scope: `requireVolunteerOpportunityScope` (and application/participation/hour/evidence helpers). Client-supplied user/opportunity IDs cannot expand scope.

| Permission | typical holder |
| --- | --- |
| `badge.definition.write` | platform_admin |
| `badge.award.issue` | platform_admin, volunteer_admin |
| `badge.award.revoke` | platform_admin |
| `content.write` | content_manager |
| `partner.write` | partner_manager |
| `admin.dashboard.read` | platform_admin, membership_admin, volunteer_admin, auditor (filtered) |
| `audit.read` | auditor, super_admin |
| `flag.write` | super_admin, platform_admin |
| `report.read` | auditor, platform_admin |

---

## 3. Hard invariants (code, not just matrix)

1. `membership.application.review` is denied if `actor.id === application.user_id`.
2. `volunteer.hours.review` is denied if `actor.id === entry.user_id`.
3. `member` cannot grant roles.
4. Membership entitlements cannot include `rbac.*` or `security.*`.
5. `auditor` has no write permissions on domain records.
6. Public verification uses no role; it uses public DTO only.
7. Volunteer Leader permission is insufficient without object scope.
8. `contribution.approve` is denied if the actor owns the contribution.
9. Badge awards never assign roles.

---

## 4. Object-level notes

- **Track lead:** future `user_roles` + `track_id` scope table `role_scopes`. Until that table exists, do not implement track-wide hour approval as global.
- **Volunteer leader:** may review hours for opportunities they organize (`organizer_user_id` or explicit assignment), never their own.

---

## 5. Enforcement helper

```ts
assertPermission(actor, permission, resource)
```

Returns 403 with generic message. Logs `security_events` on admin-route denial.

---

## 6. Mapping UI → permission

Every admin nav item maps to a permission. Missing permission: 404 (do not confirm the route exists to members) or 403 for authenticated staff.

---

## 7. Seed policy

First super admin is created via a **one-time** local/staging bootstrap command using env `BOOTSTRAP_ADMIN_EMAIL`, not committed credentials. Production bootstrap is a controlled runbook, not a hardcoded user.
