/**
 * Rutgers AI4Good 2026 — Notification Context & Provider
 * Phase 7 Notification Core State Management & Event Triggers
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Notification,
  NotificationContextValue,
  NotificationProviderProps,
  NotifyOptions,
  OrderFilledPayload,
  OrderPlacedPayload,
  OrderQueuedPayload,
  OrderRejectedPayload,
  QuizCompletedPayload,
  RecoverableFailurePayload,
  SimulationAdvancedPayload,
} from './notificationTypes';
import {
  buildOrderFilledNotification,
  buildOrderPlacedNotification,
  buildOrderRejectedNotification,
  buildQuizCompletedNotification,
  buildRecoverableFailureNotification,
  buildSimulationAdvancedNotification,
  createNotification,
  DeduplicationEngine,
  DEFAULT_DEDUPE_WINDOW_MS,
  DEFAULT_DISMISS_DURATION_MS,
} from './notificationService';

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  defaultDismissDuration = DEFAULT_DISMISS_DURATION_MS,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  // Deduplication engine tracking dedupeKeys within sliding time window
  const dedupeEngineRef = useRef<DeduplicationEngine>(new DeduplicationEngine(dedupeWindowMs));

  // Active timers for auto-dismissible notifications
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Update dedupe window if prop changes
  useEffect(() => {
    dedupeEngineRef.current = new DeduplicationEngine(dedupeWindowMs);
  }, [dedupeWindowMs]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      dedupeEngineRef.current.clear();
    };
  }, []);

  /**
   * Dismiss a specific notification by ID and cancel its auto-dismiss timer.
   */
  const dismiss = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Clear all active notifications and pending timers.
   */
  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setNotifications([]);
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  /**
   * Primary notification dispatcher with deduplication, privacy sanitization,
   * screen reader announcements, and auto-dismiss scheduling.
   */
  const notify = useCallback(
    (options: NotifyOptions): Notification | null => {
      // 1. Deduplication Engine: Suppress identical dedupeKeys within sliding time window
      if (options.dedupeKey && dedupeEngineRef.current.isDuplicate(options.dedupeKey)) {
        return null;
      }

      // 2. Create sanitized notification (guarantees redaction of tokens and passwords)
      const notification = createNotification(options, defaultDismissDuration);

      // 3. Screen Reader Announcement State
      // info/success/warning route to aria-live="polite", errors route to aria-live="assertive"
      const announcementText = notification.title
        ? `${notification.title}: ${notification.message}`
        : notification.message;

      if (notification.type === 'error') {
        setAssertiveMessage(announcementText);
      } else {
        setPoliteMessage(announcementText);
      }

      // 4. Update notification list (newest first)
      setNotifications((prev) => [notification, ...prev]);

      // 5. Schedule auto-dismiss timer if applicable
      if (notification.autoDismiss && !notification.persistent) {
        const duration = notification.dismissDuration ?? defaultDismissDuration;
        const timer = setTimeout(() => {
          dismiss(notification.id);
        }, duration);
        timersRef.current.set(notification.id, timer);
      }

      return notification;
    },
    [defaultDismissDuration, dismiss]
  );

  // ---------------------------------------------------------------------------
  // Domain Triggers / Helpers
  // ---------------------------------------------------------------------------

  const notifyOrderPlaced = useCallback(
    (payload: OrderPlacedPayload): Notification | null => {
      return notify(buildOrderPlacedNotification(payload));
    },
    [notify]
  );

  const notifyOrderQueued = useCallback(
    (payload: OrderQueuedPayload): Notification | null => {
      return notifyOrderPlaced(payload);
    },
    [notifyOrderPlaced]
  );

  const notifyOrderFilled = useCallback(
    (payload: OrderFilledPayload): Notification | null => {
      return notify(buildOrderFilledNotification(payload));
    },
    [notify]
  );

  const notifyOrderRejected = useCallback(
    (payload: OrderRejectedPayload): Notification | null => {
      return notify(buildOrderRejectedNotification(payload));
    },
    [notify]
  );

  const notifySimulationAdvanced = useCallback(
    (payload: SimulationAdvancedPayload): Notification | null => {
      return notify(buildSimulationAdvancedNotification(payload));
    },
    [notify]
  );

  const notifyQuizCompleted = useCallback(
    (payload: QuizCompletedPayload): Notification | null => {
      return notify(buildQuizCompletedNotification(payload));
    },
    [notify]
  );

  const notifyRecoverableFailure = useCallback(
    (payload: RecoverableFailurePayload): Notification | null => {
      return notify(buildRecoverableFailureNotification(payload));
    },
    [notify]
  );

  const contextValue: NotificationContextValue = {
    notifications,
    politeMessage,
    assertiveMessage,
    notify,
    dismiss,
    clearAll,
    notifyOrderPlaced,
    notifyOrderQueued,
    notifyOrderFilled,
    notifyOrderRejected,
    notifySimulationAdvanced,
    notifyQuizCompleted,
    notifyRecoverableFailure,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {/* Visually hidden live regions for screen readers conforming to WAI-ARIA */}
      <div
        className="sr-only"
        data-testid="notification-live-regions"
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
          data-testid="live-region-polite"
        >
          {politeMessage}
        </div>
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          data-testid="live-region-assertive"
        >
          {assertiveMessage}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

/**
 * Hook to access notification state and dispatch helpers.
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
