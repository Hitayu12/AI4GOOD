/**
 * Notification Center & Toast UI Component
 * Accessible, WCAG-compliant toast notification container.
 * 
 * Features:
 * - Fixed, non-intrusive container (top-right, bottom-right, etc.)
 * - Non-color-only accessibility badges: [INFO], [SUCCESS], [WARNING], [ERROR]
 * - Distinct category icons (Info, Success Checkmark, Warning Triangle, Error Hexagon)
 * - Accessible dismiss button: aria-label="Dismiss notification: <title>"
 * - Keyboard navigation: Escape key dismisses the most recent non-persistent toast
 * - Screen reader live regions: role="status" / aria-live="polite" and role="alert" / aria-live="assertive"
 * - Persistent failures remain until manually dismissed
 * - Empty state: nothing intrusive is rendered
 * 
 * Rutgers AI4Good 2026 - Kiran Phase 7
 */

import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { NotificationContext } from './NotificationContext';
import { Notification, NotificationPosition, NotificationType } from './types';

export interface NotificationCenterProps {
  /**
   * Optional controlled notifications list.
   * If omitted, NotificationCenter reads from NotificationContext.
   */
  notifications?: Notification[];
  /**
   * Optional callback fired when a notification is dismissed.
   */
  onDismiss?: (id: string) => void;
  /**
   * Position of the toast container on screen.
   * Defaults to 'top-right'.
   */
  position?: NotificationPosition;
  /**
   * Default auto-dismiss timeout in milliseconds for non-persistent notifications.
   * Defaults to 5000 ms.
   */
  defaultAutoDismissMs?: number;
  /**
   * Additional container CSS classes.
   */
  className?: string;
  /**
   * Custom test ID.
   */
  testId?: string;
}

/**
 * Returns textual badge label to satisfy WCAG non-color-only distinction.
 */
export function getBadgeText(type: NotificationType): string {
  switch (type) {
    case 'info':
      return '[INFO]';
    case 'success':
      return '[SUCCESS]';
    case 'warning':
      return '[WARNING]';
    case 'error':
      return '[ERROR]';
    default:
      return '[INFO]';
  }
}

/**
 * Formats notification timestamp into human-readable time.
 */
export function formatNotificationTimestamp(ts?: number | string | Date): string {
  if (!ts) return 'Just now';
  try {
    const date = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(date.getTime())) {
      return String(ts);
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Just now';
  }
}

/**
 * Category Icons Component
 * Renders distinct shapes for each category:
 * - Info: Circle with "i"
 * - Success: Circle with Checkmark
 * - Warning: Triangle with Exclamation
 * - Error: Hexagon with Exclamation
 */
export function CategoryIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'info':
      return (
        <svg
          aria-hidden="true"
          data-testid="icon-info"
          className="w-5 h-5 text-blue-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5h.01M12 12v4" />
        </svg>
      );
    case 'success':
      return (
        <svg
          aria-hidden="true"
          data-testid="icon-success"
          className="w-5 h-5 text-emerald-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg
          aria-hidden="true"
          data-testid="icon-warning"
          className="w-5 h-5 text-amber-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case 'error':
      return (
        <svg
          aria-hidden="true"
          data-testid="icon-error"
          className="w-5 h-5 text-rose-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {/* Distinct Hexagon Shape */}
          <polygon
            points="12,2 21,7.2 21,16.8 12,22 3,16.8 3,7.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      );
  }
}

/**
 * Toast Item Component
 * Individual accessible toast notification card.
 */
interface ToastCardProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  defaultAutoDismissMs: number;
}

const ToastCard: React.FC<ToastCardProps> = ({
  notification,
  onDismiss,
  defaultAutoDismissMs,
}) => {
  // Border and accent color mapping
  const borderStyles: Record<NotificationType, string> = {
    info: 'border-blue-200 border-l-4 border-l-blue-500',
    success: 'border-emerald-200 border-l-4 border-l-emerald-500',
    warning: 'border-amber-200 border-l-4 border-l-amber-500',
    error: 'border-rose-200 border-l-4 border-l-rose-500',
  };

  // Badge styles
  const badgeStyles: Record<NotificationType, string> = {
    info: 'bg-blue-100 text-blue-900 border-blue-300',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    warning: 'bg-amber-100 text-amber-900 border-amber-300',
    error: 'bg-rose-100 text-rose-900 border-rose-300',
  };

  // Auto-dismiss management
  useEffect(() => {
    // Persistent notifications remain visible until manually dismissed
    if (notification.persistent) {
      return;
    }

    if (notification.autoDismiss === false) {
      return;
    }

    const duration =
      notification.dismissDuration ??
      (notification as { autoDismissMs?: number }).autoDismissMs ??
      defaultAutoDismissMs;

    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    notification.id,
    notification.persistent,
    notification.autoDismiss,
    notification.dismissDuration,
    (notification as { autoDismissMs?: number }).autoDismissMs,
    defaultAutoDismissMs,
    onDismiss,
  ]);

  return (
    <div
      role="region"
      aria-label={`${notification.type} notification: ${notification.title}`}
      data-testid="toast-item"
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      className={`pointer-events-auto w-full rounded-lg border bg-white p-4 shadow-lg transition-all duration-200 ${borderStyles[notification.type]}`}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className="mt-0.5 flex-shrink-0">
          <CategoryIcon type={notification.type} />
        </div>

        {/* Content Hierarchy: Badge, Title, Body, Timestamp */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Non-color-only accessibility badge */}
            <span
              data-testid="notification-badge"
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight border ${badgeStyles[notification.type]}`}
            >
              {getBadgeText(notification.type)}
            </span>

            {/* Title */}
            <h4
              data-testid="notification-title"
              className="text-sm font-semibold text-slate-900 truncate"
            >
              {notification.title}
            </h4>
          </div>

          {/* Body message */}
          <p
            data-testid="notification-message"
            className="mt-1 text-xs text-slate-600 break-words leading-relaxed"
          >
            {notification.message}
          </p>

          {/* Timestamp & Metadata Footer */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <time
              data-testid="notification-time"
              dateTime={notification.timestamp ? new Date(notification.timestamp).toISOString() : undefined}
            >
              {formatNotificationTimestamp(notification.timestamp)}
            </time>

            {notification.persistent && (
              <span
                data-testid="persistent-indicator"
                className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
              >
                Persistent
              </span>
            )}
          </div>
        </div>

        {/* Accessible Dismiss Button */}
        <div className="flex-shrink-0 -mr-1 -mt-1">
          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            aria-label={`Dismiss notification: ${notification.title}`}
            data-testid={`dismiss-${notification.id}`}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Position class mapping for fixed container.
 */
const POSITION_CLASSES: Record<NotificationPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
};

/**
 * NotificationCenter Component
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications: propsNotifications,
  onDismiss: propsOnDismiss,
  position = 'top-right',
  defaultAutoDismissMs = 5000,
  className = '',
  testId = 'notification-center',
}) => {
  const context = useContext(NotificationContext);

  // Track locally dismissed IDs so immediate dismissal is reflected even in controlled/static props mode
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Determine source list of notifications
  const rawNotifications = useMemo(() => {
    if (propsNotifications !== undefined) {
      return propsNotifications;
    }
    return context?.notifications ?? [];
  }, [propsNotifications, context?.notifications]);

  // Active notifications (filtering out dismissed ones)
  const activeNotifications = useMemo(() => {
    return rawNotifications.filter((n) => !dismissedIds.has(n.id));
  }, [rawNotifications, dismissedIds]);

  /**
   * Dismiss handler
   */
  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      propsOnDismiss?.(id);
      context?.dismiss(id);
    },
    [propsOnDismiss, context]
  );

  /**
   * Keyboard Navigation:
   * Listen for Escape key to dismiss the most recent non-persistent toast.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Find the latest non-persistent toast
        // If newest are at index 0 (as in NotificationContext) or appended at the end,
        // we check from the end or beginning.
        // If notifications array has items, search in reverse to find the last non-persistent:
        const nonPersistentItems = activeNotifications.filter((n) => !n.persistent);
        if (nonPersistentItems.length > 0) {
          // Most recent non-persistent item (last item in sequence or first if newest-first)
          // To support both, we take the one with highest timestamp or the latest element:
          const latestItem = nonPersistentItems.reduce((latest, current) => {
            const currentTs = typeof current.timestamp === 'number' ? current.timestamp : 0;
            const latestTs = typeof latest.timestamp === 'number' ? latest.timestamp : 0;
            return currentTs >= latestTs ? current : latest;
          }, nonPersistentItems[nonPersistentItems.length - 1]);

          handleDismiss(latestItem.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeNotifications, handleDismiss]);

  // Screen reader announcements
  // Info & Success route to role="status" / aria-live="polite"
  // Warning & Error route to role="alert" / aria-live="assertive"
  const politeAnnouncements = useMemo(() => {
    const items = activeNotifications.filter((n) => n.type === 'info' || n.type === 'success');
    return items.map((n) => `${getBadgeText(n.type)} ${n.title}: ${n.message}`).join(' | ');
  }, [activeNotifications]);

  const assertiveAnnouncements = useMemo(() => {
    const items = activeNotifications.filter((n) => n.type === 'warning' || n.type === 'error');
    return items.map((n) => `${getBadgeText(n.type)} ${n.title}: ${n.message}`).join(' | ');
  }, [activeNotifications]);

  const isInsideProvider = context !== null;
  const posClass = POSITION_CLASSES[position] || POSITION_CLASSES['top-right'];

  return (
    <aside
      aria-label="Notification Center"
      data-testid={testId}
      className={`fixed z-50 pointer-events-none flex flex-col gap-2 max-w-sm w-full p-4 ${posClass} ${className}`}
    >
      {/* Screen Reader Live Regions (rendered when not inside NotificationProvider) */}
      {!isInsideProvider && (
        <div
          className="sr-only"
          data-testid="screen-reader-live-regions"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="live-announcer-polite"
          >
            {politeAnnouncements}
          </div>
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-testid="live-announcer-assertive"
          >
            {assertiveAnnouncements}
          </div>
        </div>
      )}

      {/* Render Toast Cards only when active notifications exist */}
      {activeNotifications.length > 0 &&
        activeNotifications.map((item) => (
          <ToastCard
            key={item.id}
            notification={item}
            onDismiss={handleDismiss}
            defaultAutoDismissMs={defaultAutoDismissMs}
          />
        ))}
    </aside>
  );
};

export default NotificationCenter;
