import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnswerPanel } from './AnswerPanel';

function preferReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduced-motion') ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('AnswerPanel', () => {
  beforeEach(() => preferReducedMotion(false));

  it('renders the full answer immediately when reduced motion is preferred', () => {
    preferReducedMotion(true);
    render(<AnswerPanel answer="**Hello** there" streaming={true} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText(/there/)).toBeInTheDocument();
  });

  it('copies the answer markdown to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<AnswerPanel answer="Trip plan body" streaming={false} instant />);
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('Trip plan body');
  });

  it('does not render the blink cursor under reduced motion even when streaming', () => {
    preferReducedMotion(true);
    const { container } = render(<AnswerPanel answer="Some answer" streaming={true} />);
    expect(container.querySelector('.animate-blink')).toBeNull();
  });

  it('renders the blink cursor without reduced motion while streaming', () => {
    preferReducedMotion(false);
    const { container } = render(<AnswerPanel answer="Some answer" streaming={true} />);
    expect(container.querySelector('.animate-blink')).not.toBeNull();
  });
});
