export const NOTIFICATION_EVENT_TYPES = [
  "MEMBERSHIP_APPLICATION_SUBMITTED",
  "MEMBERSHIP_CHANGES_REQUESTED",
  "MEMBERSHIP_APPROVED",
  "MEMBERSHIP_REJECTED",
  "MEMBERSHIP_SUSPENDED",
  "CREDENTIAL_ISSUED",
  "CREDENTIAL_REVOKED",
  "VOLUNTEER_APPLICATION_ACCEPTED",
  "VOLUNTEER_APPLICATION_REJECTED",
  "VOLUNTEER_HOURS_APPROVED",
  "VOLUNTEER_HOURS_REJECTED",
  "VOLUNTEER_LEVEL_CHANGED",
  "CONTRIBUTION_APPROVED",
  "CONTRIBUTION_REJECTED",
  "BADGE_AWARDED",
  "CERTIFICATE_ISSUED",
  "SYSTEM_ANNOUNCEMENT",
  "TRACK_APPLICATION_RECEIVED",
  "TRACK_APPLICATION_APPROVED",
  "TRACK_APPLICATION_REJECTED",
  "TRACK_LEADER_APPOINTED",
  "TRACK_CONTRIBUTION_STATUS_CHANGED",
  "TRACK_TASK_ASSIGNED",
  "TRACK_WORKSHOP_REMINDER",
  "TRACK_BADGE_EARNED",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_CATEGORIES = [
  "security",
  "membership",
  "volunteering",
  "recognition",
  "tracks",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const OUTBOX_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ["email", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const REQUIRED_NOTIFICATION_CATEGORIES = new Set<NotificationCategory>([
  "security",
]);

export const EVENT_CATEGORY: Record<NotificationEventType, NotificationCategory> = {
  MEMBERSHIP_APPLICATION_SUBMITTED: "membership",
  MEMBERSHIP_CHANGES_REQUESTED: "membership",
  MEMBERSHIP_APPROVED: "membership",
  MEMBERSHIP_REJECTED: "membership",
  MEMBERSHIP_SUSPENDED: "membership",
  CREDENTIAL_ISSUED: "membership",
  CREDENTIAL_REVOKED: "security",
  VOLUNTEER_APPLICATION_ACCEPTED: "volunteering",
  VOLUNTEER_APPLICATION_REJECTED: "volunteering",
  VOLUNTEER_HOURS_APPROVED: "volunteering",
  VOLUNTEER_HOURS_REJECTED: "volunteering",
  VOLUNTEER_LEVEL_CHANGED: "volunteering",
  CONTRIBUTION_APPROVED: "recognition",
  CONTRIBUTION_REJECTED: "recognition",
  BADGE_AWARDED: "recognition",
  CERTIFICATE_ISSUED: "recognition",
  SYSTEM_ANNOUNCEMENT: "system",
  TRACK_APPLICATION_RECEIVED: "tracks",
  TRACK_APPLICATION_APPROVED: "tracks",
  TRACK_APPLICATION_REJECTED: "tracks",
  TRACK_LEADER_APPOINTED: "tracks",
  TRACK_CONTRIBUTION_STATUS_CHANGED: "tracks",
  TRACK_TASK_ASSIGNED: "tracks",
  TRACK_WORKSHOP_REMINDER: "tracks",
  TRACK_BADGE_EARNED: "tracks",
};

export const EMAIL_TEMPLATE_BY_EVENT: Record<NotificationEventType, string> = {
  MEMBERSHIP_APPLICATION_SUBMITTED: "membership.submitted",
  MEMBERSHIP_CHANGES_REQUESTED: "membership.changes_requested",
  MEMBERSHIP_APPROVED: "membership.approved",
  MEMBERSHIP_REJECTED: "membership.rejected",
  MEMBERSHIP_SUSPENDED: "membership.suspended",
  CREDENTIAL_ISSUED: "credential.issued",
  CREDENTIAL_REVOKED: "credential.revoked",
  VOLUNTEER_APPLICATION_ACCEPTED: "volunteer.application_accepted",
  VOLUNTEER_APPLICATION_REJECTED: "volunteer.application_rejected",
  VOLUNTEER_HOURS_APPROVED: "volunteer.hours_approved",
  VOLUNTEER_HOURS_REJECTED: "volunteer.hours_rejected",
  VOLUNTEER_LEVEL_CHANGED: "volunteer.level_changed",
  CONTRIBUTION_APPROVED: "recognition.contribution_approved",
  CONTRIBUTION_REJECTED: "recognition.contribution_rejected",
  BADGE_AWARDED: "recognition.badge_awarded",
  CERTIFICATE_ISSUED: "recognition.certificate_issued",
  SYSTEM_ANNOUNCEMENT: "system.announcement",
  TRACK_APPLICATION_RECEIVED: "track.application_received",
  TRACK_APPLICATION_APPROVED: "track.application_approved",
  TRACK_APPLICATION_REJECTED: "track.application_rejected",
  TRACK_LEADER_APPOINTED: "track.leader_appointed",
  TRACK_CONTRIBUTION_STATUS_CHANGED: "track.contribution_status",
  TRACK_TASK_ASSIGNED: "track.task_assigned",
  TRACK_WORKSHOP_REMINDER: "track.workshop_reminder",
  TRACK_BADGE_EARNED: "track.badge_earned",
};

export const IN_APP_COPY: Record<
  NotificationEventType,
  { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }
> = {
  MEMBERSHIP_APPLICATION_SUBMITTED: {
    titleAr: "تم استلام طلب العضوية",
    titleEn: "Membership application received",
    bodyAr: "تم استلام طلبك وهو قيد المراجعة.",
    bodyEn: "Your application was received and is under review.",
  },
  MEMBERSHIP_CHANGES_REQUESTED: {
    titleAr: "مطلوب تعديلات على الطلب",
    titleEn: "Changes requested",
    bodyAr: "يرجى مراجعة طلب العضوية وتحديثه.",
    bodyEn: "Please review and update your membership application.",
  },
  MEMBERSHIP_APPROVED: {
    titleAr: "تمت الموافقة على العضوية",
    titleEn: "Membership approved",
    bodyAr: "تهانينا! تمت الموافقة على عضويتك.",
    bodyEn: "Congratulations! Your membership was approved.",
  },
  MEMBERSHIP_REJECTED: {
    titleAr: "لم تُقبل العضوية",
    titleEn: "Membership not approved",
    bodyAr: "لم تُقبل طلب العضوية في هذه المرحلة.",
    bodyEn: "Your membership application was not approved at this time.",
  },
  MEMBERSHIP_SUSPENDED: {
    titleAr: "تم تعليق العضوية",
    titleEn: "Membership suspended",
    bodyAr: "تم تعليق عضويتك. راجع حسابك للتفاصيل.",
    bodyEn: "Your membership was suspended. Check your account for details.",
  },
  CREDENTIAL_ISSUED: {
    titleAr: "تم إصدار الاعتماد",
    titleEn: "Credential issued",
    bodyAr: "اعتمادك الرقمي جاهز في محفظتك.",
    bodyEn: "Your digital credential is ready in your wallet.",
  },
  CREDENTIAL_REVOKED: {
    titleAr: "تم إلغاء الاعتماد",
    titleEn: "Credential revoked",
    bodyAr: "تم إلغاء اعتمادك الرقمي.",
    bodyEn: "Your digital credential was revoked.",
  },
  VOLUNTEER_APPLICATION_ACCEPTED: {
    titleAr: "قُبلت فرصة التطوع",
    titleEn: "Volunteer application accepted",
    bodyAr: "تم قبول طلبك للمشاركة في فرصة التطوع.",
    bodyEn: "Your volunteer application was accepted.",
  },
  VOLUNTEER_APPLICATION_REJECTED: {
    titleAr: "لم يُقبل طلب التطوع",
    titleEn: "Volunteer application rejected",
    bodyAr: "لم يُقبل طلبك لهذه الفرصة.",
    bodyEn: "Your volunteer application was not accepted for this opportunity.",
  },
  VOLUNTEER_HOURS_APPROVED: {
    titleAr: "تم اعتماد ساعات التطوع",
    titleEn: "Volunteer hours approved",
    bodyAr: "تم اعتماد ساعات التطوع المقدّمة.",
    bodyEn: "Your submitted volunteer hours were approved.",
  },
  VOLUNTEER_HOURS_REJECTED: {
    titleAr: "لم تُعتمد ساعات التطوع",
    titleEn: "Volunteer hours rejected",
    bodyAr: "لم تُعتمد ساعات التطوع المقدّمة.",
    bodyEn: "Your submitted volunteer hours were not approved.",
  },
  VOLUNTEER_LEVEL_CHANGED: {
    titleAr: "تغيّر مستوى التطوع",
    titleEn: "Volunteer level changed",
    bodyAr: "تم تحديث مستوى تطوعك المهني.",
    bodyEn: "Your volunteer progression level was updated.",
  },
  CONTRIBUTION_APPROVED: {
    titleAr: "تم اعتماد المساهمة",
    titleEn: "Contribution approved",
    bodyAr: "تم اعتماد مساهمتك المهنية.",
    bodyEn: "Your contribution was approved.",
  },
  CONTRIBUTION_REJECTED: {
    titleAr: "لم تُعتمد المساهمة",
    titleEn: "Contribution rejected",
    bodyAr: "لم تُعتمد مساهمتك في هذه المرحلة.",
    bodyEn: "Your contribution was not approved at this time.",
  },
  BADGE_AWARDED: {
    titleAr: "حصلت على شارة",
    titleEn: "Badge awarded",
    bodyAr: "تم منحك شارة مهنية جديدة.",
    bodyEn: "You were awarded a new professional badge.",
  },
  CERTIFICATE_ISSUED: {
    titleAr: "تم إصدار شهادة",
    titleEn: "Certificate issued",
    bodyAr: "شهادتك المعتمدة جاهزة للتحقق.",
    bodyEn: "Your certificate is ready for verification.",
  },
  SYSTEM_ANNOUNCEMENT: {
    titleAr: "إعلان من العيادة",
    titleEn: "Clinic announcement",
    bodyAr: "لديك إعلان جديد من العيادة.",
    bodyEn: "You have a new announcement from the Clinic.",
  },
  TRACK_APPLICATION_RECEIVED: {
    titleAr: "تم استلام طلب المسار",
    titleEn: "Track application received",
    bodyAr: "تم استلام طلب انضمامك إلى المسار وهو قيد المراجعة.",
    bodyEn: "Your track join application was received and is under review.",
  },
  TRACK_APPLICATION_APPROVED: {
    titleAr: "تمت الموافقة على الانضمام للمسار",
    titleEn: "Track application approved",
    bodyAr: "تمت الموافقة على انضمامك إلى المسار المهني.",
    bodyEn: "Your track membership application was approved.",
  },
  TRACK_APPLICATION_REJECTED: {
    titleAr: "لم يُقبل طلب المسار",
    titleEn: "Track application rejected",
    bodyAr: "لم يُقبل طلب انضمامك إلى المسار في هذه المرحلة.",
    bodyEn: "Your track application was not approved at this time.",
  },
  TRACK_LEADER_APPOINTED: {
    titleAr: "تم تعيينك في قيادة مسار",
    titleEn: "Track leadership appointed",
    bodyAr: "تم تعيينك قائداً أو نائباً لمسار مهني.",
    bodyEn: "You were appointed as a track leader or deputy.",
  },
  TRACK_CONTRIBUTION_STATUS_CHANGED: {
    titleAr: "تحديث حالة مساهمة المسار",
    titleEn: "Track contribution status updated",
    bodyAr: "تم تحديث حالة مساهمتك داخل المسار.",
    bodyEn: "Your track contribution status was updated.",
  },
  TRACK_TASK_ASSIGNED: {
    titleAr: "مهمة مسار جديدة",
    titleEn: "Track task assigned",
    bodyAr: "تم تعيين مهمة جديدة لك داخل المسار.",
    bodyEn: "A new track task was assigned to you.",
  },
  TRACK_WORKSHOP_REMINDER: {
    titleAr: "تذكير بورشة المسار",
    titleEn: "Track workshop reminder",
    bodyAr: "لديك ورشة أو فعالية قادمة ضمن مسارك.",
    bodyEn: "You have an upcoming workshop or event in your track.",
  },
  TRACK_BADGE_EARNED: {
    titleAr: "شارة مسار جديدة",
    titleEn: "Track badge earned",
    bodyAr: "حصلت على شارة مرتبطة بمسارك المهني.",
    bodyEn: "You earned a badge related to your professional track.",
  },
};

export const MAX_OUTBOX_ATTEMPTS = 3;
export const OUTBOX_BACKOFF_MS = [0, 60_000, 300_000] as const;
