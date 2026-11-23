/**
 * Notification UI Types & Interfaces
 * Rutgers AI4Good 2026 - Kiran Phase 7
 */

import { Notification, NotificationType } from './notificationTypes';

export type { Notification, NotificationType };
export type NotificationItem = Notification;

export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface NotificationCenterProps {
  /**
   * Optional controlled notifications list.
   * If omitted, NotificationCenter will attempt to read from NotificationContext.
   */
  notifications?: Notification[];
  /**
   * Callback fired when a notification is dismissed by the user or auto-dismiss.
   */
  onDismiss?: (id: string) => void;
  /**
   * Position on the viewport for the fixed toast container.
   * Defaults to 'top-right'.
   */
  position?: NotificationPosition;
  /**
   * Default auto-dismiss timeout in milliseconds for non-persistent notifications.
   * Defaults to 5000 ms.
   */
  defaultAutoDismissMs?: number;
  /**
   * Additional custom CSS classes for the toast container.
   */
  className?: string;
  /**
   * Custom test ID for the container.
   */
  testId?: string;
}
