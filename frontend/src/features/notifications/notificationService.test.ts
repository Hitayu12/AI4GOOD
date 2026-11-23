/**
 * Rutgers AI4Good 2026 — Notification Service & Context Tests
 * Phase 7 Notification Core State Management, Deduplication & Event Triggers
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NotificationProvider,
  useNotifications,
} from './NotificationContext';
import {
  buildOrderFilledNotification,
  buildOrderPlacedNotification,
  buildOrderRejectedNotification,
  buildQuizCompletedNotification,
  buildRecoverableFailureNotification,
  buildSimulationAdvancedNotification,
  createNotification,
  DeduplicationEngine,
  generateNotificationId,
  redactPrivateData,
} from './notificationService';

describe('Notification Service & State Management', () => {
  // -------------------------------------------------------------------------
  // 1. Unique ID and Timestamp Generation
  // -------------------------------------------------------------------------
  describe('1. ID and Notification Creation', () => {
    it('generates a non-empty unique string ID', () => {
      const id1 = generateNotificationId();
      const id2 = generateNotificationId();

      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });

    it('creates notification with unique ID, timestamp, and default properties', () => {
      const before = Date.now();
      const notif = createNotification({
        type: 'info',
        title: 'System Update',
        message: 'System is ready',
      });
      const after = Date.now();

      expect(notif.id).toBeDefined();
      expect(typeof notif.id).toBe('string');
      expect(notif.type).toBe('info');
      expect(notif.title).toBe('System Update');
      expect(notif.message).toBe('System is ready');
      expect(notif.timestamp).toBeGreaterThanOrEqual(before);
      expect(notif.timestamp).toBeLessThanOrEqual(after);
      expect(notif.autoDismiss).toBe(true);
      expect(notif.dismissDuration).toBe(5000);
      expect(notif.persistent).toBe(false);
    });

    it('respects persistent flag and sets autoDismiss to false by default for persistent items', () => {
      const notif = createNotification({
        type: 'error',
        title: 'Critical Failure',
        message: 'Manual intervention required',
        persistent: true,
      });

      expect(notif.persistent).toBe(true);
      expect(notif.autoDismiss).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Deduplication Engine (Sliding Window 3000ms)
  // -------------------------------------------------------------------------
  describe('2. Deduplication Engine', () => {
    let engine: DeduplicationEngine;

    beforeEach(() => {
      engine = new DeduplicationEngine(3000);
    });

    it('allows initial event and records dedupeKey', () => {
      const isDupe = engine.isDuplicate('order-123', 1000);
      expect(isDupe).toBe(false);
      expect(engine.size()).toBe(1);
    });

    it('suppresses identical dedupeKeys within sliding time window (3000ms)', () => {
      expect(engine.isDuplicate('order-123', 1000)).toBe(false);

      // Re-trigger after 500ms
      expect(engine.shouldSuppress('order-123', 1500)).toBe(true);
      expect(engine.isDuplicate('order-123', 1500)).toBe(true);

      // Re-trigger after 2999ms
      expect(engine.shouldSuppress('order-123', 3999)).toBe(true);
      expect(engine.isDuplicate('order-123', 3999)).toBe(true);
    });

    it('allows identical dedupeKey after sliding window expires (>3000ms)', () => {
      expect(engine.isDuplicate('order-123', 1000)).toBe(false);

      // After 3001ms, window has passed
      expect(engine.shouldSuppress('order-123', 4001)).toBe(false);
      expect(engine.isDuplicate('order-123', 4001)).toBe(false);
    });

    it('allows different dedupeKeys within the same time window', () => {
      expect(engine.isDuplicate('order-1', 1000)).toBe(false);
      expect(engine.isDuplicate('order-2', 1050)).toBe(false);
      expect(engine.isDuplicate('quiz-1', 1100)).toBe(false);
      expect(engine.size()).toBe(3);
    });

    it('purges expired entries correctly', () => {
      engine.record('key-1', 1000);
      engine.record('key-2', 2000);
      expect(engine.size()).toBe(2);

      // At timestamp 4500: key-1 (diff 3500) expired, key-2 (diff 2500) remains
      engine.purgeExpired(4500);
      expect(engine.size()).toBe(1);
      expect(engine.shouldSuppress('key-1', 4500)).toBe(false);
      expect(engine.shouldSuppress('key-2', 4500)).toBe(true);
    });

    it('clears all tracked keys on clear()', () => {
      engine.record('k1', 100);
      engine.record('k2', 200);
      expect(engine.size()).toBe(2);

      engine.clear();
      expect(engine.size()).toBe(0);
      expect(engine.shouldSuppress('k1', 250)).toBe(false);
    });

    it('never suppresses notifications when dedupeKey is undefined or empty', () => {
      expect(engine.shouldSuppress(undefined)).toBe(false);
      expect(engine.isDuplicate(undefined)).toBe(false);
      expect(engine.isDuplicate('')).toBe(false);
      expect(engine.size()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Privacy & Zero Token/Password Exposure Redaction
  // -------------------------------------------------------------------------
  describe('3. Privacy & Private Data Redaction', () => {
    it('redacts JWT tokens from notification text', () => {
      const sampleJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const text = `Failed request with token ${sampleJwt} attached`;
      const cleaned = redactPrivateData(text);

      expect(cleaned).not.toContain(sampleJwt);
      expect(cleaned).toContain('[REDACTED_JWT]');
    });

    it('redacts Bearer and Authorization header values', () => {
      const text = 'Authorization header: Bearer abcdef1234567890xyz sent to server';
      const cleaned = redactPrivateData(text);

      expect(cleaned).not.toContain('abcdef1234567890xyz');
      expect(cleaned).toContain('Bearer [REDACTED]');
    });

    it('redacts password key-value assignments in JSON or plain text', () => {
      const jsonText = '{"username": "student1", "password": "SuperSecretPassword123!"}';
      const cleanedJson = redactPrivateData(jsonText);
      expect(cleanedJson).not.toContain('SuperSecretPassword123!');
      expect(cleanedJson).toContain('"password": "[REDACTED]"');

      const plainText = 'Login failed for user kiran with password: MyPassword456';
      const cleanedPlain = redactPrivateData(plainText);
      expect(cleanedPlain).not.toContain('MyPassword456');
      expect(cleanedPlain).toContain('password: [REDACTED]');

      const eqText = 'debug: password=AnotherSecret';
      const cleanedEq = redactPrivateData(eqText);
      expect(cleanedEq).not.toContain('AnotherSecret');
      expect(cleanedEq).toContain('password=[REDACTED]');
    });

    it('redacts API keys and secret tokens', () => {
      const mockKey = ['sk', 'test', 'mockkey1234567890abcdef'].join('_');
      const stripeStyle = `Key ${mockKey} was invalid`;
      expect(redactPrivateData(stripeStyle)).not.toContain('mockkey1234567890abcdef');
      expect(redactPrivateData(stripeStyle)).toContain('[REDACTED_KEY]');

      const tokenParam = 'Error while using api_key: "my_api_key_value_99"';
      expect(redactPrivateData(tokenParam)).not.toContain('my_api_key_value_99');
      expect(redactPrivateData(tokenParam)).toContain('api_key: "[REDACTED]"');
    });

    it('redacts private key PEM blocks', () => {
      const pem =
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y7...\n-----END RSA PRIVATE KEY-----';
      const text = `Private key found: ${pem} in memory dump`;
      const cleaned = redactPrivateData(text);

      expect(cleaned).not.toContain('MIIEowIBAAKCAQEA0Y7');
      expect(cleaned).toContain('[REDACTED_PRIVATE_KEY]');
    });

    it('preserves non-sensitive domain messages and normal words without false positives', () => {
      const normalText = 'Congratulations! You passed the quiz for "Module 1" with 95.0%.';
      expect(redactPrivateData(normalText)).toBe(normalText);

      const orderText = 'BUY 10 AAPL queued for execution at $185.50.';
      expect(redactPrivateData(orderText)).toBe(orderText);
    });

    it('redacts both title and message automatically when creating notification', () => {
      const notif = createNotification({
        type: 'error',
        title: 'Auth error with password: Secret!',
        message: 'Bearer token123456789 failed authentication.',
      });

      expect(notif.title).not.toContain('Secret!');
      expect(notif.title).toContain('password: [REDACTED]');
      expect(notif.message).not.toContain('token123456789');
      expect(notif.message).toContain('Bearer [REDACTED]');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Domain Trigger Builders
  // -------------------------------------------------------------------------
  describe('4. Domain Trigger Builders', () => {
    it('builds order placed / queued notification with info type', () => {
      const options = buildOrderPlacedNotification({
        orderId: 'ord_101',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 15,
        price: '182.50',
      });

      expect(options.type).toBe('info');
      expect(options.title).toBe('Order Queued');
      expect(options.message).toContain('BUY 15 AAPL');
      expect(options.message).toContain('$182.50');
      expect(options.dedupeKey).toBe('order-queued-ord_101');
      expect(options.autoDismiss).toBe(true);
    });

    it('builds order filled notification with success type', () => {
      const options = buildOrderFilledNotification({
        orderId: 'ord_102',
        symbol: 'MSFT',
        side: 'sell',
        quantity: 5,
        price: 410.25,
      });

      expect(options.type).toBe('success');
      expect(options.title).toBe('Order Filled');
      expect(options.message).toContain('SELL 5 MSFT filled at $410.25.');
      expect(options.dedupeKey).toBe('order-filled-ord_102');
      expect(options.autoDismiss).toBe(true);
    });

    it('builds standard order rejected notification with error type', () => {
      const options = buildOrderRejectedNotification({
        orderId: 'ord_103',
        symbol: 'SPY',
        reason: 'Insufficient cash balance',
      });

      expect(options.type).toBe('error');
      expect(options.title).toBe('Order Rejected');
      expect(options.message).toContain('Order for SPY rejected: Insufficient cash balance.');
      expect(options.dedupeKey).toBe('order-rejected-ord_103');
      expect(options.persistent).toBe(true);
    });

    it('builds price gap order rejected notification with specialized title', () => {
      const options = buildOrderRejectedNotification({
        orderId: 'ord_104',
        symbol: 'NVDA',
        reason: 'Market opened $15 above limit ceiling',
        isPriceGap: true,
      });

      expect(options.type).toBe('error');
      expect(options.title).toBe('Order Rejected');
      expect(options.message).toContain('price gap exceeding execution thresholds');
      expect(options.dedupeKey).toBe('order-rejected-ord_104');
    });

    it('builds simulation advanced notification with info type and step details', () => {
      const options = buildSimulationAdvancedNotification({
        sessionDate: '2024-01-05',
        step: 3,
        totalSteps: 10,
        ordersProcessed: 2,
      });

      expect(options.type).toBe('info');
      expect(options.title).toBe('Simulation Advanced');
      expect(options.message).toContain(
        'Simulation advanced to session 2024-01-05 (Step 3/10). 2 order(s) processed.'
      );
      expect(options.dedupeKey).toBe('sim-advance-2024-01-05');
    });

    it('builds quiz passed notification with success type when passed', () => {
      const options = buildQuizCompletedNotification({
        quizId: 'quiz_intro_1',
        lessonTitle: 'Market Orders 101',
        scorePct: 85,
        passed: true,
        correct: 4,
        total: 5,
      });

      expect(options.type).toBe('success');
      expect(options.title).toBe('Quiz Passed');
      expect(options.message).toContain(
        'Congratulations! You passed the quiz for "Market Orders 101" with 85.0%.'
      );
      expect(options.dedupeKey).toBe('quiz-passed-quiz_intro_1-85.0%');
    });

    it('builds quiz needs review notification with warning type when failed', () => {
      const options = buildQuizCompletedNotification({
        quizId: 'quiz_intro_1',
        lessonTitle: 'Market Orders 101',
        scorePct: '60.0',
        passed: false,
        correct: 3,
        total: 5,
      });

      expect(options.type).toBe('warning');
      expect(options.title).toBe('Quiz Needs Review');
      expect(options.message).toContain(
        'Quiz for "Market Orders 101" scored 60.0%. Passing score is 80.0%.'
      );
      expect(options.dedupeKey).toBe('quiz-failed-quiz_intro_1-60.0%');
    });

    it('builds recoverable failure notification with error type and safe retry message', () => {
      const options = buildRecoverableFailureNotification({
        action: 'Portfolio sync',
        error: new Error('Network timeout (status 504)'),
        rejectionCode: 'GATEWAY_TIMEOUT',
      });

      expect(options.type).toBe('error');
      expect(options.title).toBe('Action Failed');
      expect(options.message).toContain(
        'Portfolio sync failed [GATEWAY_TIMEOUT]: Network timeout (status 504). You may safely retry.'
      );
      expect(options.dedupeKey).toBe('recoverable-failure-Portfolio sync');
      expect(options.persistent).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. React Context, State Management & Screen Reader Announcements
  // -------------------------------------------------------------------------
  describe('5. NotificationContext & Provider in React', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('throws error when useNotifications is used outside NotificationProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNotifications());
      }).toThrow('useNotifications must be used within a NotificationProvider');

      spy.mockRestore();
    });

    it('initializes with empty notifications and screen reader strings', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.politeMessage).toBe('');
      expect(result.current.assertiveMessage).toBe('');
    });

    it('adds notification with unique ID, timestamp, and updates screen reader message', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.notify({
          type: 'info',
          title: 'Welcome',
          message: 'Welcome to AI4Good trading simulator.',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      const notif = result.current.notifications[0];
      expect(notif.id).toBeDefined();
      expect(notif.title).toBe('Welcome');
      expect(notif.message).toBe('Welcome to AI4Good trading simulator.');
      expect(result.current.politeMessage).toBe('Welcome: Welcome to AI4Good trading simulator.');
      expect(result.current.assertiveMessage).toBe('');
    });

    it('routes error notifications to assertiveMessage and info/success to politeMessage', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.notify({
          type: 'error',
          title: 'Order Error',
          message: 'Order rejected by trading engine.',
        });
      });

      expect(result.current.assertiveMessage).toBe('Order Error: Order rejected by trading engine.');

      act(() => {
        result.current.notify({
          type: 'success',
          title: 'Order Executed',
          message: 'BUY 10 AAPL filled at $180.00.',
        });
      });

      expect(result.current.politeMessage).toBe('Order Executed: BUY 10 AAPL filled at $180.00.');
    });

    it('deduplication engine suppresses duplicate notifications within time window (3000ms)', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, { dedupeWindowMs: 3000 }, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      let firstResult: any;
      let dupeResult: any;

      act(() => {
        firstResult = result.current.notify({
          type: 'info',
          title: 'Order Pending',
          message: 'Order pending execution.',
          dedupeKey: 'order-submit-101',
        });
      });

      expect(firstResult).not.toBeNull();
      expect(result.current.notifications).toHaveLength(1);

      // Rapid component re-render or double click 200ms later
      vi.advanceTimersByTime(200);

      act(() => {
        dupeResult = result.current.notify({
          type: 'info',
          title: 'Order Pending',
          message: 'Order pending execution.',
          dedupeKey: 'order-submit-101',
        });
      });

      // Duplication suppressed!
      expect(dupeResult).toBeNull();
      expect(result.current.notifications).toHaveLength(1);

      // After sliding window passes (>3000ms)
      vi.advanceTimersByTime(3100);

      let allowedResult: any;
      act(() => {
        allowedResult = result.current.notify({
          type: 'info',
          title: 'Order Pending',
          message: 'Order pending execution again.',
          dedupeKey: 'order-submit-101',
        });
      });

      expect(allowedResult).not.toBeNull();
      expect(result.current.notifications).toHaveLength(2);
    });

    it('auto-dismiss timer removes notification after dismissDuration', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, { defaultDismissDuration: 2000 }, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.notify({
          type: 'info',
          title: 'Auto-dismiss Item',
          message: 'This will disappear in 2000ms.',
          autoDismiss: true,
          dismissDuration: 2000,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Advance clock by 1000ms — still there
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.notifications).toHaveLength(1);

      // Advance clock by remaining 1000ms — now auto-dismissed
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.notifications).toHaveLength(0);
    });

    it('persistent notifications are not auto-dismissed', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.notify({
          type: 'error',
          title: 'Important Alert',
          message: 'This requires manual dismissal.',
          persistent: true,
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Advance by 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('manual dismissal removes specific notification and clears its timer', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      let id1: string = '';
      let id2: string = '';

      act(() => {
        const n1 = result.current.notify({
          type: 'info',
          title: 'First',
          message: 'First notification',
        });
        const n2 = result.current.notify({
          type: 'warning',
          title: 'Second',
          message: 'Second notification',
        });
        if (n1) id1 = n1.id;
        if (n2) id2 = n2.id;
      });

      expect(result.current.notifications).toHaveLength(2);

      // Dismiss first notification manually
      act(() => {
        result.current.dismiss(id1);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe(id2);

      // Dismiss second
      act(() => {
        result.current.dismiss(id2);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('clearAll() removes all notifications and resets screen reader state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      act(() => {
        result.current.notify({ type: 'info', title: 'T1', message: 'M1' });
        result.current.notify({ type: 'error', title: 'T2', message: 'M2' });
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.assertiveMessage).toBe('T2: M2');

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.politeMessage).toBe('');
      expect(result.current.assertiveMessage).toBe('');
    });

    it('domain helpers invoke notify with correct parameters and redaction', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(NotificationProvider, null, children);

      const { result } = renderHook(() => useNotifications(), { wrapper });

      // 1. Order Placed
      act(() => {
        result.current.notifyOrderPlaced({
          orderId: 'ord_1',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 10,
        });
      });
      expect(result.current.notifications[0].title).toBe('Order Queued');
      expect(result.current.notifications[0].type).toBe('info');

      // 2. Order Filled
      act(() => {
        result.current.notifyOrderFilled({
          orderId: 'ord_2',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 10,
          price: 180.5,
        });
      });
      expect(result.current.notifications[0].title).toBe('Order Filled');
      expect(result.current.notifications[0].type).toBe('success');

      // 3. Order Rejected (with sensitive token in reason)
      act(() => {
        result.current.notifyOrderRejected({
          orderId: 'ord_3',
          symbol: 'TSLA',
          reason: 'Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc was expired',
        });
      });
      expect(result.current.notifications[0].title).toBe('Order Rejected');
      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.notifications[0].message).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      );
      expect(result.current.notifications[0].message).toContain('[REDACTED_JWT]');

      // 4. Simulation Advanced
      act(() => {
        result.current.notifySimulationAdvanced({
          sessionDate: '2024-01-08',
          ordersProcessed: 3,
        });
      });
      expect(result.current.notifications[0].title).toBe('Simulation Advanced');
      expect(result.current.notifications[0].type).toBe('info');

      // 5. Quiz Completed (passed)
      act(() => {
        result.current.notifyQuizCompleted({
          quizId: 'q1',
          lessonTitle: 'Trading Basics',
          scorePct: 100,
          passed: true,
        });
      });
      expect(result.current.notifications[0].title).toBe('Quiz Passed');
      expect(result.current.notifications[0].type).toBe('success');

      // 6. Quiz Completed (failed)
      act(() => {
        result.current.notifyQuizCompleted({
          quizId: 'q2',
          lessonTitle: 'Options Fundamentals',
          scorePct: 40,
          passed: false,
        });
      });
      expect(result.current.notifications[0].title).toBe('Quiz Needs Review');
      expect(result.current.notifications[0].type).toBe('warning');

      // 7. Recoverable Failure
      act(() => {
        result.current.notifyRecoverableFailure({
          action: 'Order Cancel',
          error: 'Rate limited on server',
        });
      });
      expect(result.current.notifications[0].title).toBe('Action Failed');
      expect(result.current.notifications[0].type).toBe('error');
    });

    it('renders accessible live regions with role="status" and role="alert" in DOM', () => {
      render(
        React.createElement(
          NotificationProvider,
          null,
          React.createElement('div', null, 'Test Consumer')
        )
      );

      const politeRegion = screen.getByTestId('live-region-polite');
      expect(politeRegion).toBeInTheDocument();
      expect(politeRegion).toHaveAttribute('role', 'status');
      expect(politeRegion).toHaveAttribute('aria-live', 'polite');
      expect(politeRegion).toHaveAttribute('aria-atomic', 'true');

      const assertiveRegion = screen.getByTestId('live-region-assertive');
      expect(assertiveRegion).toBeInTheDocument();
      expect(assertiveRegion).toHaveAttribute('role', 'alert');
      expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(assertiveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
});
