import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimulationView from './SimulationView';
import { SimulationService } from './simulationService';
import {
  FIXTURE_DATASET_ID,
  INITIAL_SIMULATION_FIXTURE,
} from './simulationFixtures';
import { Simulation } from './simulationTypes';

describe('SimulationView Component', () => {
  // Test 1: Dataset metadata and limitation disclosure render properly
  it('1. verifies dataset metadata, real/synthetic badge, symbol universe, and limitation disclosure render properly', () => {
    render(<SimulationView />);

    // Dataset label
    expect(screen.getByTestId('dataset-label')).toHaveTextContent(
      'US S&P 500 Sample 2024 (Verified No Corporate Actions)'
    );

    // Real vs Synthetic badge
    const badge = screen.getByTestId('dataset-type-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Verified Real Historical Data \(No Corporate Actions\)/i);

    // Source
    expect(screen.getByTestId('dataset-source')).toHaveTextContent('Authoritative Daily OHLCV Archive');

    // Dataset ID
    expect(screen.getByTestId('dataset-id')).toHaveTextContent(FIXTURE_DATASET_ID);

    // Symbol universe
    const symbolUniverse = screen.getByTestId('symbol-universe');
    expect(symbolUniverse).toBeInTheDocument();
    expect(screen.getByTestId('symbol-badge-AAPL')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('symbol-badge-MSFT')).toHaveTextContent('MSFT');
    expect(screen.getByTestId('symbol-badge-SPY')).toHaveTextContent('SPY');

    // Price-only limitation disclosure
    const disclosure = screen.getByTestId('limitation-disclosure');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).toHaveTextContent(/Educational Price-Only Model Disclosure \(MVP\)/i);
    expect(disclosure).toHaveTextContent(/unadjusted daily OHLCV/i);
    expect(disclosure).toHaveTextContent(/dividends and stock splits/i);
    expect(disclosure).toHaveTextContent(/options execution are strictly excluded/i);
  });

  // Test 2: Time cursor banner shows current session and simulated UTC close
  it('2. verifies time cursor banner shows current session, simulated UTC close, status, and version', () => {
    render(<SimulationView />);

    const banner = screen.getByTestId('time-cursor-banner');
    expect(banner).toBeInTheDocument();

    // Current session date
    const sessionElem = screen.getByTestId('cursor-current-session');
    expect(sessionElem).toHaveTextContent('2024-01-02');

    // UTC close timestamp
    const timeElem = screen.getByTestId('cursor-current-time');
    expect(timeElem).toHaveTextContent('2024-01-02T21:00:00Z');

    // Status badge
    const statusBadge = screen.getByTestId('simulation-status-badge');
    expect(statusBadge).toHaveTextContent('Active');

    // Version
    const versionElem = screen.getByTestId('simulation-version');
    expect(versionElem).toHaveTextContent('v1');
  });

  // Test 3: "Advance Session" updates the cursor and increments the version
  it('3. verifies "Advance Session" updates the cursor to next session and increments the version', async () => {
    const onAdvanceSpy = vi.fn();
    render(<SimulationView onAdvance={onAdvanceSpy} />);

    // Initial state check
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-02');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v1');

    // Click "Advance Session"
    const advanceBtn = screen.getByTestId('advance-session-btn');
    expect(advanceBtn).not.toBeDisabled();
    fireEvent.click(advanceBtn);

    // After advance
    await waitFor(() => {
      expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-03');
    });

    expect(screen.getByTestId('cursor-current-time')).toHaveTextContent('2024-01-03T21:00:00Z');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v2');
    expect(onAdvanceSpy).toHaveBeenCalledTimes(1);
    expect(onAdvanceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        current_session: '2024-01-03',
        version: 2,
        status: 'active',
      })
    );
  });

  // Test 4: Market data table/chart only shows sessions up to the current cursor (no future prices)
  it('4. strictly enforces zero-lookahead: market data table only shows sessions up to current cursor', async () => {
    render(<SimulationView />);

    // At initial cursor 2024-01-02:
    // 2024-01-02 row MUST be in the table
    await waitFor(() => {
      expect(screen.getByTestId('market-data-row-2024-01-02')).toBeInTheDocument();
    });

    // 2024-01-03, 2024-01-04, 2024-01-05 MUST NOT be in the table
    expect(screen.queryByTestId('market-data-row-2024-01-03')).toBeNull();
    expect(screen.queryByTestId('market-data-row-2024-01-04')).toBeNull();
    expect(screen.queryByTestId('market-data-row-2024-01-05')).toBeNull();

    // Locked banner and placeholders must be present
    const lockBanner = screen.getByTestId('future-data-locked-banner');
    expect(lockBanner).toBeInTheDocument();
    expect(lockBanner).toHaveTextContent(/Future prices are locked until the session is advanced/i);
    expect(screen.getByTestId('locked-session-2024-01-03')).toBeInTheDocument();
    expect(screen.getByTestId('locked-session-2024-01-04')).toBeInTheDocument();

    // Now advance to 2024-01-03
    fireEvent.click(screen.getByTestId('advance-session-btn'));

    // 2024-01-03 row MUST NOW appear
    await waitFor(() => {
      expect(screen.getByTestId('market-data-row-2024-01-03')).toBeInTheDocument();
    });

    // 2024-01-02 is still visible as historical
    expect(screen.getByTestId('market-data-row-2024-01-02')).toBeInTheDocument();

    // 2024-01-04 is STILL NOT in the table
    expect(screen.queryByTestId('market-data-row-2024-01-04')).toBeNull();
    expect(screen.getByTestId('locked-session-2024-01-04')).toBeInTheDocument();
  });

  // Test 5: Advancing a completed simulation displays the appropriate completed status/alert and disables further advances
  it('5. disables advance button when simulation status is completed and displays completed status/alert', async () => {
    const completedSim: Simulation = {
      ...INITIAL_SIMULATION_FIXTURE,
      id: 'sim_completed_test',
      current_session: '2024-01-08',
      current_time: '2024-01-08T21:00:00Z',
      status: 'completed',
      version: 5,
    };

    const service = new SimulationService([completedSim]);
    render(<SimulationView service={service} initialSimulations={[completedSim]} />);

    // Status badge must show Completed
    const statusBadge = screen.getByTestId('simulation-status-badge');
    expect(statusBadge).toHaveTextContent('Completed');

    // Advance button must be disabled
    const advanceBtn = screen.getByTestId('advance-session-btn');
    expect(advanceBtn).toBeDisabled();
    expect(advanceBtn).toHaveTextContent('Simulation Completed');

    // Triggering click anyway (e.g. programmatically) does not advance
    fireEvent.click(advanceBtn);

    // Expect cursor to remain unchanged
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-08');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v5');
  });

  // Test 6: Time never advances automatically on mount
  it('6. verifies time NEVER advances automatically during page load or mount', async () => {
    const onAdvanceSpy = vi.fn();
    const service = new SimulationService([{ ...INITIAL_SIMULATION_FIXTURE }]);
    const advanceSpy = vi.spyOn(service, 'advanceSimulation');

    render(<SimulationView service={service} onAdvance={onAdvanceSpy} />);

    // Wait 100ms to ensure no timers or mount effects trigger an advance
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(advanceSpy).not.toHaveBeenCalled();
    expect(onAdvanceSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-02');
    expect(screen.getByTestId('cursor-current-time')).toHaveTextContent('2024-01-02T21:00:00Z');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v1');
  });

  // Additional Test 7: Starting cash validation and simulation creation
  it('7. validates starting cash bounds ($1,000 to $1,000,000,000; default $10,000.00) and creates new simulation', async () => {
    const service = new SimulationService();
    render(<SimulationView service={service} />);

    // Open create simulation panel
    const openBtn = screen.getByTestId('toggle-create-sim-btn');
    fireEvent.click(openBtn);

    const input = screen.getByTestId('starting-cash-input') as HTMLInputElement;
    expect(input.value).toBe('10000'); // defaults to $10,000.00

    const submitBtn = screen.getByTestId('submit-create-sim-btn');

    // Test bound: below $1,000
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/Starting cash must be at least \$1,000.00/i)).toBeInTheDocument();

    // Test bound: above $1,000,000,000
    fireEvent.change(input, { target: { value: '2000000000' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/Starting cash cannot exceed \$1,000,000,000.00/i)).toBeInTheDocument();

    // Valid input: $25,000
    fireEvent.change(input, { target: { value: '25000' } });
    fireEvent.click(submitBtn);

    // Modal closes and new simulation is active
    await waitFor(() => {
      expect(screen.queryByTestId('create-simulation-panel')).toBeNull();
    });

    expect(screen.getByText(/Initial Cash: \$25,000.00/i)).toBeInTheDocument();
  });

  // Additional Test 8: Switching / Resuming existing simulations
  it('8. allows switching and resuming existing simulations', async () => {
    const simA: Simulation = {
      ...INITIAL_SIMULATION_FIXTURE,
      id: 'sim_user_001',
      current_session: '2024-01-02',
      version: 1,
    };
    const simB: Simulation = {
      ...INITIAL_SIMULATION_FIXTURE,
      id: 'sim_user_002',
      current_session: '2024-01-04',
      current_time: '2024-01-04T21:00:00Z',
      version: 3,
    };

    const service = new SimulationService([simA, simB]);
    render(<SimulationView service={service} initialSimulations={[simA, simB]} />);

    // Initially simA is active
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-02');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v1');

    // Switch to simB via dropdown
    const select = screen.getByTestId('simulation-select');
    fireEvent.change(select, { target: { value: 'sim_user_002' } });

    // Expect cursor to reflect simB
    expect(screen.getByTestId('cursor-current-session')).toHaveTextContent('2024-01-04');
    expect(screen.getByTestId('cursor-current-time')).toHaveTextContent('2024-01-04T21:00:00Z');
    expect(screen.getByTestId('simulation-version')).toHaveTextContent('v3');
  });

  // Additional Test 9: Stale version 409 conflict error alert
  it('9. displays clear error alert on 409 stale version conflict', async () => {
    const service = new SimulationService();
    // Simulate stale version by modifying the simulation version in service out-of-band
    render(<SimulationView service={service} />);

    // Force an out-of-band mutation to create a 409 stale version
    const sim = await service.getSimulation(INITIAL_SIMULATION_FIXTURE.id);
    service.setSimulation({ ...sim, version: 99 });

    // User attempts to advance expecting version 1
    fireEvent.click(screen.getByTestId('advance-session-btn'));

    await waitFor(() => {
      const alert = screen.getByTestId('advance-error-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Version Conflict \(409\):/i);
      expect(alert).toHaveTextContent(/Expected version 1 does not match current simulation version 99/i);
    });
  });

  // Additional Test 10: Symbol picker changes active market data
  it('10. switches active symbol to MSFT and SPY and renders respective OHLCV data', async () => {
    render(<SimulationView />);

    // Default symbol AAPL
    expect(screen.getByTestId('symbol-picker-AAPL')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Viewing Symbol:/i)).toHaveTextContent('AAPL');

    // Switch to MSFT
    fireEvent.click(screen.getByTestId('symbol-picker-MSFT'));
    expect(screen.getByTestId('symbol-picker-MSFT')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Viewing Symbol:/i)).toHaveTextContent('MSFT');

    // Switch to SPY
    fireEvent.click(screen.getByTestId('symbol-picker-SPY'));
    expect(screen.getByTestId('symbol-picker-SPY')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Viewing Symbol:/i)).toHaveTextContent('SPY');
  });
});
