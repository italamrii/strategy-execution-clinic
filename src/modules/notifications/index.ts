import {
  scheduleNotification,
  processNotificationOutbox,
  drainOutboxForTests,
  listUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreference,
  retryFailedNotification,
  countFailedNotifications,
  listFailedNotifications,
} from "./service";
import {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CATEGORIES,
  type NotificationEventType,
} from "./catalog";
export {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  updateNotificationPreferenceAction,
} from "./actions";
import { renderEmailTemplate, toEmailMessage } from "./email-templates";
import { sanitizePlainText, sanitizeRichText, buildTrustedUrl } from "./sanitize";

export {
  notifyDomainEvent,
} from "./notify";

export {
  scheduleNotification,
  processNotificationOutbox,
  drainOutboxForTests,
  listUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreference,
  retryFailedNotification,
  countFailedNotifications,
  listFailedNotifications,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_CATEGORIES,
  renderEmailTemplate,
  toEmailMessage,
  sanitizePlainText,
  sanitizeRichText,
  buildTrustedUrl,
  type NotificationEventType,
};
export { shouldEnqueueTransactionalEmail } from "./email-gate";
