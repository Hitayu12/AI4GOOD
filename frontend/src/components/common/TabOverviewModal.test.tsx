import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TabOverviewModal, TAB_OVERVIEWS, AppTab } from './TabOverviewModal';

describe('TabOverviewModal Component', () => {
  it('does not render anything when isOpen is false', () => {
    render(<TabOverviewModal tab="home" isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders correctly for each supported tab when isOpen is true', () => {
    const tabs: AppTab[] = [
      'home',
      'portfolio',
      'trading',
      'simulation',
      'learning',
      'calculator',
      'tutor',
      'status',
    ];

    for (const tab of tabs) {
      const { unmount } = render(
        <TabOverviewModal tab={tab} isOpen={true} onClose={vi.fn()} />
      );

      const expectedData = TAB_OVERVIEWS[tab];
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: new RegExp(`${expectedData.tabName}: ${expectedData.title}`, 'i'),
        })
      ).toBeInTheDocument();
      expect(screen.getByText(expectedData.summary)).toBeInTheDocument();

      unmount();
    }
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<TabOverviewModal tab="trading" isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /Close tab overview popup/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', () => {
    const handleClose = vi.fn();
    render(<TabOverviewModal tab="portfolio" isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose and optional onNavigateTab when action button is clicked', () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();

    render(
      <TabOverviewModal
        tab="calculator"
        isOpen={true}
        onClose={handleClose}
        onNavigateTab={handleNavigate}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /Explore Calculators/i });
    fireEvent.click(actionBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleNavigate).toHaveBeenCalledWith('calculator');
  });
});
