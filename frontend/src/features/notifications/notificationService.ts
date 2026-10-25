/**
 * Rutgers AI4Good 2026 — Notification Core Service
 * Phase 7 State Management, Deduplication Engine & Event Triggers
 */

import {
  Notification,
  NotifyOptions,
  OrderFilledPayload,
  OrderPlacedPayload,
  OrderRejectedPayload,
  QuizCompletedPayload,
  RecoverableFailurePayload,
  SimulationAdvancedPayload,
} from './notificationTypes';

export const DEFAULT_DEDUPE_WINDOW_MS = 3000;
export const DEFAULT_DISMISS_DURATION_MS = 5000;

// ---------------------------------------------------------------------------
// ID Generator
// ---------------------------------------------------------------------------

let fallbackCounter = 0;

/**
 * Generates a unique notification ID.
 */
export function generateNotificationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `notif_${Date.now()}_${fallbackCounter}_${Math.random().toString(36).substring(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Privacy & Redaction Engine
// ---------------------------------------------------------------------------

/**
 * Redacts tokens, passwords, secrets, private keys, and authorization headers
 * from notification strings to guarantee zero exposure in UI or screen reader announcements.
 */
export function redactPrivateData(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // 1. Private keys (e.g. PEM blocks)
  sanitized = sanitized.replace(
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gi,
    '[REDACTED_PRIVATE_KEY]'
  );

  // 2. JWTs (standard three-segment base64 url-encoded structures starting with eyJ)
  sanitized = sanitized.replace(
    /\beyJ[a-zA-Z0-9_-]{4,}\.eyJ[a-zA-Z0-9_-]{4,}\.[a-zA-Z0-9_-]{4,}\b/g,
    '[REDACTED_JWT]'
  );

  // Also standalone potential 3-part base64 tokens with eyJ prefix
  sanitized = sanitized.replace(
    /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    '[REDACTED_JWT]'
  );

  // 3. Known key prefixes (e.g. Stripe, GitHub, etc.)
  sanitized = sanitized.replace(
    /\b(?:sk_live|sk_test|ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{12,}\b/gi,
    '[REDACTED_KEY]'
  );

  // 4. Authorization headers / Bearer / Basic tokens
  sanitized = sanitized.replace(
    /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/-]+=*/gi,
    '$1 [REDACTED]'
  );

  // 5. Key-value pairs for passwords, tokens, API keys, secrets
  const sensitiveFieldNames = [
    'password',
    'passwd',
    'token',
    'access_token',
    'refresh_token',
    'auth_token',
    'secret',
    'secret_key',
    'api_key',
    'apikey',
    'private_key',
  ];
  const fieldPattern = sensitiveFieldNames.join('|');

  // Matches JSON or assignment style:
  // "password": "...", password: ..., password=..., 'token': '...'
  const kvRegex = new RegExp(
    `(["']?\\b(?:${fieldPattern})\\b["']?\\s*[:=]\\s*)(["']?)([^\\s,;"'}\\]]+)(["']?)`,
    'gi'
  );
  sanitized = sanitized.replace(kvRegex, '$1$2[REDACTED]$4');

  return sanitized;
}

// ---------------------------------------------------------------------------
// Deduplication Engine
// ---------------------------------------------------------------------------

/**
 * Deduplication Engine tracking recent dedupeKeys within a sliding time window (3000ms default)
 * to prevent duplicate announcements on re-renders, rapid polling, or quick user retries.
 */
export class DeduplicationEngine {
  private cache = new Map<string, number>();
  private windowMs: number;

  constructor(windowMs: number = DEFAULT_DEDUPE_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Returns true if the dedupeKey was recorded within the sliding window.
   */
  public shouldSuppress(dedupeKey?: string, now: number = Date.now()): boolean {
    if (!dedupeKey) return false;
    this.purgeExpired(now);
    const lastSeen = this.cache.get(dedupeKey);
    return lastSeen !== undefined && now - lastSeen < this.windowMs;
  }

  /**
   * Records a dedupeKey with current timestamp.
   */
  public record(dedupeKey?: string, now: number = Date.now()): void {
    if (!dedupeKey) return;
    this.cache.set(dedupeKey, now);
  }

  /**
   * Combined check-and-record:
   * Returns true if duplicate (and suppresses it),
   * or records key and returns false (allowing emission).
   */
  public isDuplicate(dedupeKey?: string, now: number = Date.now()): boolean {
    if (!dedupeKey) return false;
    if (this.shouldSuppress(dedupeKey, now)) {
      return true;
    }
    this.record(dedupeKey, now);
    return false;
  }

  /**
   * Cleans up keys older than the sliding window.
   */
  public purgeExpired(now: number = Date.now()): void {
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp >= this.windowMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire deduplication cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current active cached keys count.
   */
  public size(): number {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// Domain Trigger Builders
// ---------------------------------------------------------------------------

function formatPriceDisplay(price?: string | number): string {
  if (price === undefined || price === null || price === '') return '';
  if (typeof price === 'number') {
    return `$${price.toFixed(2)}`;
  }
  const clean = price.replace(/^\$/, '');
  const num = Number(clean);
  return isNaN(num) ? price : `$${num.toFixed(2)}`;
}

/**
 * Builds notification options for an order placed/queued event.
 */
export function buildOrderPlacedNotification(payload: OrderPlacedPayload): NotifyOptions {
  const sideUpper = (payload.side || 'buy').toUpperCase();
  const pricePart = payload.price ? ` at ${formatPriceDisplay(payload.price)}` : '';
  const message = `${sideUpper} ${payload.quantity} ${payload.symbol}${pricePart} queued for execution.`;

  return {
    type: 'info',
    title: 'Order Queued',
    message,
    dedupeKey: payload.dedupeKey ?? `order-queued-${payload.orderId}`,
    autoDismiss: payload.autoDismiss ?? true,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent,
  };
}

/**
 * Builds notification options for an order execution / fill event.
 */
export function buildOrderFilledNotification(payload: OrderFilledPayload): NotifyOptions {
  const sideUpper = (payload.side || 'buy').toUpperCase();
  const priceDisplay = formatPriceDisplay(payload.price);
  const message = `${sideUpper} ${payload.quantity} ${payload.symbol} filled at ${priceDisplay}.`;

  return {
    type: 'success',
    title: 'Order Filled',
    message,
    dedupeKey: payload.dedupeKey ?? `order-filled-${payload.orderId}`,
    autoDismiss: payload.autoDismiss ?? true,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent,
  };
}

/**
 * Builds notification options for an order rejected or price gap event.
 */
export function buildOrderRejectedNotification(payload: OrderRejectedPayload): NotifyOptions {
  const isGap = Boolean(payload.isPriceGap);
  const title = 'Order Rejected';
  const symbolPart = payload.symbol ? ` for ${payload.symbol}` : '';
  const reasonPart = payload.reason ? `: ${payload.reason}` : '';
  const message = isGap
    ? `Order${symbolPart} rejected due to price gap exceeding execution thresholds${reasonPart}.`
    : `Order${symbolPart} rejected${reasonPart}.`;

  const dedupeKey =
    payload.dedupeKey ?? `order-rejected-${payload.orderId ?? payload.symbol ?? 'unknown'}`;

  return {
    type: 'error',
    title,
    message,
    dedupeKey,
    autoDismiss: payload.autoDismiss ?? false,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent ?? true,
  };
}

/**
 * Builds notification options for a simulation advance event.
 */
export function buildSimulationAdvancedNotification(
  payload: SimulationAdvancedPayload
): NotifyOptions {
  const ordersPart =
    payload.ordersProcessed !== undefined
      ? ` ${payload.ordersProcessed} order(s) processed.`
      : '';
  const stepPart =
    payload.step !== undefined && payload.totalSteps !== undefined
      ? ` (Step ${payload.step}/${payload.totalSteps})`
      : '';
  const message = `Simulation advanced to session ${payload.sessionDate}${stepPart}.${ordersPart}`;

  return {
    type: 'info',
    title: 'Simulation Advanced',
    message,
    dedupeKey: payload.dedupeKey ?? `sim-advance-${payload.sessionDate}`,
    autoDismiss: payload.autoDismiss ?? true,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent,
  };
}

/**
 * Builds notification options for a quiz completion event.
 */
export function buildQuizCompletedNotification(payload: QuizCompletedPayload): NotifyOptions {
  const scoreNum = typeof payload.scorePct === 'string' ? parseFloat(payload.scorePct) : payload.scorePct;
  const scoreFormatted = isNaN(scoreNum) ? `${payload.scorePct}%` : `${scoreNum.toFixed(1)}%`;
  const lessonPart = payload.lessonTitle ? ` for "${payload.lessonTitle}"` : '';

  if (payload.passed) {
    return {
      type: 'success',
      title: 'Quiz Passed',
      message: `Congratulations! You passed the quiz${lessonPart} with ${scoreFormatted}.`,
      dedupeKey: payload.dedupeKey ?? `quiz-passed-${payload.quizId ?? 'quiz'}-${scoreFormatted}`,
      autoDismiss: payload.autoDismiss ?? true,
      dismissDuration: payload.dismissDuration,
      persistent: payload.persistent,
    };
  }

  return {
    type: 'warning',
    title: 'Quiz Needs Review',
    message: `Quiz${lessonPart} scored ${scoreFormatted}. Passing score is 80.0%. Review lesson concepts and retry.`,
    dedupeKey: payload.dedupeKey ?? `quiz-failed-${payload.quizId ?? 'quiz'}-${scoreFormatted}`,
    autoDismiss: payload.autoDismiss ?? true,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent,
  };
}

/**
 * Builds notification options for a recoverable system or API failure.
 */
export function buildRecoverableFailureNotification(
  payload: RecoverableFailurePayload
): NotifyOptions {
  const rawMsg =
    payload.error instanceof Error
      ? payload.error.message
      : typeof payload.error === 'string'
      ? payload.error
      : 'An unexpected error occurred.';

  const codePart = payload.rejectionCode ? ` [${payload.rejectionCode}]` : '';
  const message = `${payload.action} failed${codePart}: ${rawMsg}. You may safely retry.`;

  return {
    type: 'error',
    title: 'Action Failed',
    message,
    dedupeKey: payload.dedupeKey ?? `recoverable-failure-${payload.action}`,
    autoDismiss: payload.autoDismiss ?? false,
    dismissDuration: payload.dismissDuration,
    persistent: payload.persistent ?? true,
  };
}

/**
 * Creates a sanitized notification object from NotifyOptions.
 */
export function createNotification(
  options: NotifyOptions,
  defaultDismissDuration: number = DEFAULT_DISMISS_DURATION_MS
): Notification {
  const cleanTitle = redactPrivateData(options.title);
  const cleanMessage = redactPrivateData(options.message);

  return {
    id: options.id || generateNotificationId(),
    type: options.type,
    title: cleanTitle,
    message: cleanMessage,
    timestamp: Date.now(),
    autoDismiss: options.autoDismiss ?? !options.persistent,
    dismissDuration: options.dismissDuration ?? defaultDismissDuration,
    dedupeKey: options.dedupeKey,
    persistent: options.persistent ?? false,
  };
}
