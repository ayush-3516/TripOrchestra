import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPanel } from './HistoryPanel';

vi.mock('../api/plan', () => ({
  fetchHistory: vi.fn().mockResolvedValue([]),
}));

describe('HistoryPanel accessibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes dialog semantics', async () => {
    render(<HistoryPanel open onClose={() => {}} onSelect={() => {}} refreshKey={0} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<HistoryPanel open onClose={onClose} onSelect={() => {}} refreshKey={0} />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
