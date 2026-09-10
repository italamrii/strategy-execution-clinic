import { getOptionalAuthContext } from "@/modules/identity";
import { AccessDenied } from "@/shared/ui/access-denied";
import { AdminNav } from "@/shared/ui/admin-nav";
import { getTranslations } from "next-intl/server";

const ADMIN_SHELL_PERMISSIONS = [
  "admin.dashboard.read",
  "admin.settings.manage",
  "settings.manage",
  "membership.read.any",
  "membership.manage",
  "track.manage",
  "credential.read.any",
  "card.template.manage",
  "credential.template.manage",
  "consultation.read.any",
  "meeting.manage",
  "volunteer.manage",
  "volunteer.profile.read.any",
  "contribution.read.any",
  "content.write",
  "announcement.manage",
  "audit.read",
  "security.events.read",
  "support.request.read.any",
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getOptionalAuthContext();
  if (!auth) {
    return <AccessDenied status="unauthenticated" />;
  }
  const canEnterAdmin = ADMIN_SHELL_PERMISSIONS.some((permission) =>
    auth.permissions.includes(permission),
  );
  if (!canEnterAdmin) {
    return <AccessDenied status="forbidden" email={auth.email} />;
  }
  const t = await getTranslations("adminNav");
  return (
    <div className="admin-shell">
      <aside className="admin-shell__rail">
        <div>
          <p className="eyebrow">SEC · ADMIN</p>
          <h2>{t("title")}</h2>
          <p>{t("subtitle")}</p>
        </div>
        <AdminNav permissions={auth.permissions} />
      </aside>
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}

