import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('theme toggle (integration)', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('toggles the dark class on <html> when the header button is clicked', async () => {
    render(<App />);
    // System default is light (matchMedia stub returns false) → Moon icon, "Switch to dark mode".
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await userEvent.click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('trip-theme')).toBe('dark');

    // Button now offers the reverse action.
    await userEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
