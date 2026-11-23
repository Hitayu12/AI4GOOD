/**
 * NotificationCenter Component Tests
 * Rutgers AI4Good 2026 - Kiran Phase 7
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationCenter } from './NotificationCenter';
import { NotificationProvider, useNotifications } from './NotificationContext';
import { Notification } from './types';

describe('NotificationCenter Component — Phase 7 Accessible Toast & Notification UI', () => {
  const mockTimestamp = 1704283200000; // 2024-01-03T12:00:00.000Z

  const sampleInfoNotification: Notification = {
    id: 'notif-info-1',
    type: 'info',
    title: 'Order Queued',
    message: 'Buy order for 10 shares of AAPL queued for next session.',
    timestamp: mockTimestamp,
    persistent: false,
    autoDismiss: true,
    dismissDuration: 5000,
  };

  const sampleSuccessNotification: Notification = {
    id: 'notif-success-1',
    type: 'success',
    title: 'Order Executed',
    message: 'Purchased 10 shares of AAPL at $185.50.',
    timestamp: mockTimestamp,
    persistent: false,
    autoDismiss: true,
    dismissDuration: 5000,
  };

  const sampleWarningNotification: Notification = {
    id: 'notif-warning-1',
    type: 'warning',
    title: 'Market Volatility High',
    message: 'Slippage may occur on market orders placed during auction.',
    timestamp: mockTimestamp,
    persistent: false,
    autoDismiss: true,
    dismissDuration: 5000,
  };

  const sampleErrorNotification: Notification = {
    id: 'notif-error-1',
    type: 'error',
    title: 'Price Gap Detected',
    message: 'Execution aborted due to unexpected +12.4% price gap.',
    timestamp: mockTimestamp,
    persistent: true,
    autoDismiss: false,
  };

  // ---------------------------------------------------------------------------
  // Test 1: Renders notification toasts with correct badges and accessible labels
  // ---------------------------------------------------------------------------
  describe('1. Renders notification toasts with correct badges and accessible labels', () => {
    it('renders all four categories with explicit textual badges [INFO], [SUCCESS], [WARNING], [ERROR]', () => {
      const allToasts: Notification[] = [
        sampleInfoNotification,
        sampleSuccessNotification,
        sampleWarningNotification,
        sampleErrorNotification,
      ];

      render(<NotificationCenter notifications={allToasts} />);

      // Non-color-only explicit text badges
      expect(screen.getByText('[INFO]')).toBeInTheDocument();
      expect(screen.getByText('[SUCCESS]')).toBeInTheDocument();
      expect(screen.getByText('[WARNING]')).toBeInTheDocument();
      expect(screen.getByText('[ERROR]')).toBeInTheDocument();

      // Titles and messages
      expect(screen.getByText('Order Queued')).toBeInTheDocument();
      expect(screen.getByText('Order Executed')).toBeInTheDocument();
      expect(screen.getByText('Market Volatility High')).toBeInTheDocument();
      expect(screen.getByText('Price Gap Detected')).toBeInTheDocument();

      const messages = screen.getAllByTestId('notification-message');
      expect(messages).toHaveLength(4);
      expect(messages[0]).toHaveTextContent(/Buy order for 10 shares of AAPL queued/i);
      expect(messages[1]).toHaveTextContent(/Purchased 10 shares of AAPL at \$185\.50/i);
      expect(messages[2]).toHaveTextContent(/Slippage may occur/i);
      expect(messages[3]).toHaveTextContent(/Execution aborted due to unexpected \+12\.4% price gap/i);
    });

    it('renders distinct category icons with aria-hidden="true"', () => {
      render(
        <NotificationCenter
          notifications={[
            sampleInfoNotification,
            sampleSuccessNotification,
            sampleWarningNotification,
            sampleErrorNotification,
          ]}
        />
      );

      const infoIcon = screen.getByTestId('icon-info');
      const successIcon = screen.getByTestId('icon-success');
      const warningIcon = screen.getByTestId('icon-warning');
      const errorIcon = screen.getByTestId('icon-error');

      expect(infoIcon).toBeInTheDocument();
      expect(infoIcon).toHaveAttribute('aria-hidden', 'true');

      expect(successIcon).toBeInTheDocument();
      expect(successIcon).toHaveAttribute('aria-hidden', 'true');

      expect(warningIcon).toBeInTheDocument();
      expect(warningIcon).toHaveAttribute('aria-hidden', 'true');

      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders accessible dismiss buttons with aria-label="Dismiss notification: <title>"', () => {
      render(
        <NotificationCenter
          notifications={[sampleInfoNotification, sampleErrorNotification]}
        />
      );

      const dismissInfoBtn = screen.getByRole('button', {
        name: 'Dismiss notification: Order Queued',
      });
      const dismissErrorBtn = screen.getByRole('button', {
        name: 'Dismiss notification: Price Gap Detected',
      });

      expect(dismissInfoBtn).toBeInTheDocument();
      expect(dismissErrorBtn).toBeInTheDocument();
    });

    it('renders timestamps and persistent indicator badge for persistent notifications', () => {
      render(
        <NotificationCenter
          notifications={[sampleInfoNotification, sampleErrorNotification]}
        />
      );

      const times = screen.getAllByTestId('notification-time');
      expect(times.length).toBe(2);

      // Persistent indicator badge
      const persistentBadge = screen.getByTestId('persistent-indicator');
      expect(persistentBadge).toBeInTheDocument();
      expect(persistentBadge).toHaveTextContent(/Persistent/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Dismiss button click removes toast from the screen
  // ---------------------------------------------------------------------------
  describe('2. Dismiss button click removes toast from the screen', () => {
    it('removes the clicked toast from the DOM and invokes onDismiss callback', () => {
      const onDismissSpy = vi.fn();
      render(
        <NotificationCenter
          notifications={[sampleInfoNotification, sampleSuccessNotification]}
          onDismiss={onDismissSpy}
        />
      );

      expect(screen.getByText('Order Queued')).toBeInTheDocument();
      expect(screen.getByText('Order Executed')).toBeInTheDocument();

      // Click dismiss on the first toast
      const dismissBtn = screen.getByRole('button', {
        name: 'Dismiss notification: Order Queued',
      });
      fireEvent.click(dismissBtn);

      // Callback invoked with the notification id
      expect(onDismissSpy).toHaveBeenCalledWith('notif-info-1');

      // The dismissed toast is immediately removed from the screen
      expect(screen.queryByText('Order Queued')).not.toBeInTheDocument();

      // The remaining toast is still visible
      expect(screen.getByText('Order Executed')).toBeInTheDocument();
    });

    it('removes toast when no explicit onDismiss callback is passed (uncontrolled dismiss)', () => {
      render(
        <NotificationCenter notifications={[sampleInfoNotification]} />
      );

      expect(screen.getByText('Order Queued')).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', {
        name: 'Dismiss notification: Order Queued',
      });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText('Order Queued')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Pressing Escape key dismisses the latest toast
  // ---------------------------------------------------------------------------
  describe('3. Pressing Escape key dismisses the latest toast', () => {
    it('dismisses the most recent non-persistent toast when Escape is pressed', () => {
      const onDismissSpy = vi.fn();
      const toast1: Notification = {
        id: 'toast-1',
        type: 'info',
        title: 'First Notification',
        message: 'Older message',
        timestamp: 1000,
        persistent: false,
      };
      const toast2: Notification = {
        id: 'toast-2',
        type: 'success',
        title: 'Second Notification',
        message: 'Newer message',
        timestamp: 2000,
        persistent: false,
      };

      render(
        <NotificationCenter
          notifications={[toast1, toast2]}
          onDismiss={onDismissSpy}
        />
      );

      expect(screen.getByText('First Notification')).toBeInTheDocument();
      expect(screen.getByText('Second Notification')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      // Dismisses the latest toast (toast-2)
      expect(onDismissSpy).toHaveBeenCalledWith('toast-2');
      expect(screen.queryByText('Second Notification')).not.toBeInTheDocument();
      expect(screen.getByText('First Notification')).toBeInTheDocument();

      // Press Escape again
      fireEvent.keyDown(window, { key: 'Escape' });

      // Dismisses toast-1
      expect(onDismissSpy).toHaveBeenCalledWith('toast-1');
      expect(screen.queryByText('First Notification')).not.toBeInTheDocument();
    });

    it('skips persistent notifications and dismisses only non-persistent ones on Escape', () => {
      const persistentToast: Notification = {
        id: 'persistent-err',
        type: 'error',
        title: 'Fatal API Gap',
        message: 'Cannot execute trades',
        timestamp: 3000,
        persistent: true,
      };
      const nonPersistentToast: Notification = {
        id: 'info-toast',
        type: 'info',
        title: 'Connection Notice',
        message: 'Connected',
        timestamp: 1000,
        persistent: false,
      };

      render(
        <NotificationCenter
          notifications={[nonPersistentToast, persistentToast]}
        />
      );

      expect(screen.getByText('Fatal API Gap')).toBeInTheDocument();
      expect(screen.getByText('Connection Notice')).toBeInTheDocument();

      // Press Escape: should dismiss the non-persistent toast, NOT the persistent one
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByText('Connection Notice')).not.toBeInTheDocument();
      expect(screen.getByText('Fatal API Gap')).toBeInTheDocument();

      // Press Escape again: persistent toast must NOT be dismissed by Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.getByText('Fatal API Gap')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Screen reader live region contains announcement text
  // ---------------------------------------------------------------------------
  describe('4. Screen reader live region contains announcement text', () => {
    it('routes info and success notifications to role="status" (aria-live="polite")', () => {
      render(
        <NotificationCenter
          notifications={[sampleInfoNotification, sampleSuccessNotification]}
        />
      );

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveTextContent(/\[INFO\] Order Queued: Buy order for 10 shares of AAPL queued/i);
      expect(statusRegion).toHaveTextContent(/\[SUCCESS\] Order Executed: Purchased 10 shares of AAPL at \$185\.50/i);

      // Assertive region should be empty
      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
      expect(alertRegion).toHaveTextContent('');
    });

    it('routes warning and error notifications to role="alert" (aria-live="assertive")', () => {
      render(
        <NotificationCenter
          notifications={[sampleWarningNotification, sampleErrorNotification]}
        />
      );

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
      expect(alertRegion).toHaveTextContent(/\[WARNING\] Market Volatility High: Slippage may occur/i);
      expect(alertRegion).toHaveTextContent(/\[ERROR\] Price Gap Detected: Execution aborted/i);

      // Status region should be empty
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveTextContent('');
    });

    it('renders live regions inside visually hidden container conforming to WAI-ARIA', () => {
      render(<NotificationCenter notifications={[sampleInfoNotification]} />);

      const liveRegionsWrapper = screen.getByTestId('screen-reader-live-regions');
      expect(liveRegionsWrapper).toHaveClass('sr-only');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Persistent errors remain in the DOM without auto-dismissing
  // ---------------------------------------------------------------------------
  describe('5. Persistent errors remain in the DOM without auto-dismissing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-dismisses non-persistent toasts after duration, but keeps persistent errors indefinitely', () => {
      const nonPersistentToast: Notification = {
        id: 'auto-dismiss-1',
        type: 'info',
        title: 'Auto Dismissing Toast',
        message: 'Will vanish in 3s',
        timestamp: Date.now(),
        persistent: false,
        autoDismiss: true,
        dismissDuration: 3000,
      };

      const persistentError: Notification = {
        id: 'persistent-error-1',
        type: 'error',
        title: 'Critical Gap Failure',
        message: 'Requires manual acknowledgment',
        timestamp: Date.now(),
        persistent: true,
        autoDismiss: false,
      };

      render(
        <NotificationCenter
          notifications={[nonPersistentToast, persistentError]}
        />
      );

      expect(screen.getByText('Auto Dismissing Toast')).toBeInTheDocument();
      expect(screen.getByText('Critical Gap Failure')).toBeInTheDocument();

      // Advance by 3500ms
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      // Non-persistent toast is now dismissed
      expect(screen.queryByText('Auto Dismissing Toast')).not.toBeInTheDocument();

      // Persistent error MUST remain in DOM
      expect(screen.getByText('Critical Gap Failure')).toBeInTheDocument();

      // Advance by a large duration (e.g. 60 seconds)
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Persistent error STILL remains
      expect(screen.getByText('Critical Gap Failure')).toBeInTheDocument();

      // Manually dismiss the persistent error
      const dismissBtn = screen.getByRole('button', {
        name: 'Dismiss notification: Critical Gap Failure',
      });
      fireEvent.click(dismissBtn);

      // Now it is gone
      expect(screen.queryByText('Critical Gap Failure')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Empty state: when no notifications exist, nothing intrusive is rendered
  // ---------------------------------------------------------------------------
  describe('6. Empty state: when no notifications exist, nothing intrusive is rendered', () => {
    it('renders zero toast items, zero dismiss buttons, and no visible intrusion when empty', () => {
      render(<NotificationCenter notifications={[]} />);

      // No toast item cards
      expect(screen.queryByTestId('toast-item')).toBeNull();

      // No dismiss buttons
      expect(screen.queryAllByRole('button')).toHaveLength(0);

      // Container is non-intrusive (pointer-events-none)
      const container = screen.getByTestId('notification-center');
      expect(container).toHaveClass('pointer-events-none');

      // Live regions exist for screen readers but are empty
      expect(screen.getByRole('status')).toHaveTextContent('');
      expect(screen.getByRole('alert')).toHaveTextContent('');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Integration with NotificationProvider & useNotifications hook
  // ---------------------------------------------------------------------------
  describe('7. Integration with NotificationProvider and useNotifications context', () => {
    const TestConsumer: React.FC = () => {
      const { notifyOrderPlaced, notifyOrderRejected } = useNotifications();

      return (
        <div>
          <button
            type="button"
            onClick={() =>
              notifyOrderPlaced({
                orderId: 'ord-101',
                symbol: 'AAPL',
                side: 'buy',
                quantity: 5,
                price: 150,
              })
            }
          >
            Trigger Order Placed
          </button>
          <button
            type="button"
            onClick={() =>
              notifyOrderRejected({
                symbol: 'AAPL',
                reason: 'Price gap exceeded 10%',
                isPriceGap: true,
                persistent: true,
              })
            }
          >
            Trigger Price Gap Error
          </button>
          <NotificationCenter />
        </div>
      );
    };

    it('renders toasts dynamically triggered via notification context helpers', () => {
      render(
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      );

      // Initially empty
      expect(screen.queryByTestId('toast-item')).toBeNull();

      // Dispatch order placed
      fireEvent.click(screen.getByText('Trigger Order Placed'));
      expect(screen.getByRole('heading', { name: 'Order Queued' })).toBeInTheDocument();
      expect(screen.getByText('[INFO]')).toBeInTheDocument();

      // Dispatch price gap error
      fireEvent.click(screen.getByText('Trigger Price Gap Error'));
      expect(screen.getByRole('heading', { name: 'Order Rejected' })).toBeInTheDocument();
      expect(screen.getByText('[ERROR]')).toBeInTheDocument();
      expect(screen.getAllByText(/Price gap exceeded 10%/i).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 8: Custom positioning classes
  // ---------------------------------------------------------------------------
  describe('8. Custom positioning classes', () => {
    it('applies top-right, bottom-right, top-left, and bottom-left position classes properly', () => {
      const { rerender } = render(
        <NotificationCenter notifications={[sampleInfoNotification]} position="top-right" />
      );
      expect(screen.getByTestId('notification-center')).toHaveClass('top-4');
      expect(screen.getByTestId('notification-center')).toHaveClass('right-4');

      rerender(
        <NotificationCenter notifications={[sampleInfoNotification]} position="bottom-right" />
      );
      expect(screen.getByTestId('notification-center')).toHaveClass('bottom-4');
      expect(screen.getByTestId('notification-center')).toHaveClass('right-4');

      rerender(
        <NotificationCenter notifications={[sampleInfoNotification]} position="top-left" />
      );
      expect(screen.getByTestId('notification-center')).toHaveClass('top-4');
      expect(screen.getByTestId('notification-center')).toHaveClass('left-4');

      rerender(
        <NotificationCenter notifications={[sampleInfoNotification]} position="bottom-left" />
      );
      expect(screen.getByTestId('notification-center')).toHaveClass('bottom-4');
      expect(screen.getByTestId('notification-center')).toHaveClass('left-4');
    });
  });
});
