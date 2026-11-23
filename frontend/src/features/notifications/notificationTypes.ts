/**
 * Rutgers AI4Good 2026 — Notification Core Types
 * Phase 7 Notification State Management & Event Triggers
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  autoDismiss?: boolean;
  dismissDuration?: number;
  dedupeKey?: string;
  persistent?: boolean;
}

export interface NotifyOptions {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  dedupeKey?: string;
  persistent?: boolean;
}

// ---------------------------------------------------------------------------
// Trigger Payload Types
// ---------------------------------------------------------------------------

/**
 * Trigger payload for order submission / queued (info)
 */
export interface OrderQueuedPayload {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: string | number;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

export type OrderPlacedPayload = OrderQueuedPayload;

/**
 * Trigger payload for order execution / filled (success)
 */
export interface OrderFilledPayload {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: string | number;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

/**
 * Trigger payload for order rejected / price gap (error)
 */
export interface OrderRejectedPayload {
  orderId?: string;
  symbol?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  reason: string;
  rejectionCode?: string;
  isPriceGap?: boolean;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

/**
 * Trigger payload for simulation session advance (info)
 */
export interface SimulationAdvancedPayload {
  sessionDate: string;
  step?: number;
  totalSteps?: number;
  ordersProcessed?: number;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

/**
 * Trigger payload for quiz completion (success if passed, warning if failed)
 */
export interface QuizCompletedPayload {
  quizId?: string;
  lessonTitle?: string;
  scorePct: number | string;
  passed: boolean;
  correct?: number;
  total?: number;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

/**
 * Trigger payload for recoverable failures (error)
 */
export interface RecoverableFailurePayload {
  action: string;
  error: string | Error;
  rejectionCode?: string;
  retryAction?: () => void;
  dedupeKey?: string;
  autoDismiss?: boolean;
  dismissDuration?: number;
  persistent?: boolean;
}

// ---------------------------------------------------------------------------
// Context Value & Provider Props
// ---------------------------------------------------------------------------

export interface NotificationContextValue {
  notifications: Notification[];
  politeMessage: string;
  assertiveMessage: string;
  notify: (options: NotifyOptions) => Notification | null;
  dismiss: (id: string) => void;
  clearAll: () => void;
  notifyOrderPlaced: (payload: OrderPlacedPayload) => Notification | null;
  notifyOrderQueued: (payload: OrderQueuedPayload) => Notification | null;
  notifyOrderFilled: (payload: OrderFilledPayload) => Notification | null;
  notifyOrderRejected: (payload: OrderRejectedPayload) => Notification | null;
  notifySimulationAdvanced: (payload: SimulationAdvancedPayload) => Notification | null;
  notifyQuizCompleted: (payload: QuizCompletedPayload) => Notification | null;
  notifyRecoverableFailure: (payload: RecoverableFailurePayload) => Notification | null;
}

export interface NotificationProviderProps {
  children?: React.ReactNode;
  defaultDismissDuration?: number;
  dedupeWindowMs?: number;
}
