import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App.jsx';

// jsdom doesn't implement scrollTo — App/SegmentedControl call it on mount.
window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();

// M5's Definition-of-Done check: profile loads with correct data, and a
// notification/language toggle change persists after reload. See FRE-329.

const STREET = { id: 1, name: 'Reyer Anslostraat', members: 12, households: 111 };

vi.mock('./hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Wendy', house_number: '52', is_super_admin: false, memberships: [{ streetId: 1, status: 'approved', role: 'resident' }] },
    logout: vi.fn(),
  }),
}));

// Stands in for the backend: push settings persist across "reloads"
// (remounts) the same way they'd survive a real page reload — via the
// server, not localStorage.
let pushSettings = {};

vi.mock('./api/client.js', () => ({
  api: {
    get: vi.fn((path) => {
      if (path === '/streets/1/posts') return Promise.resolve([]);
      if (path === '/streets/1') return Promise.resolve(STREET);
      if (path === '/streets') return Promise.resolve([]);
      if (path === '/notifications/unread-count') return Promise.resolve({ count: 0 });
      if (path === '/push/settings') return Promise.resolve(pushSettings);
      return Promise.resolve(null);
    }),
    post: vi.fn(() => Promise.resolve(null)),
    patch: vi.fn((path, body) => {
      if (path === '/push/settings') Object.assign(pushSettings, body.settings);
      return Promise.resolve(null);
    }),
    delete: vi.fn(() => Promise.resolve(null)),
  },
}));

describe('Profile & Settings smoke test (M5 DoD)', () => {
  beforeEach(() => {
    pushSettings = {};
    localStorage.removeItem('lang');
  });

  it('loads profile with correct data, and a notification toggle persists after reload', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Profiel'));

    // Profile loads with correct data
    expect(await screen.findByText('Wendy')).toBeInTheDocument();
    expect(screen.getByText('Reyer Anslostraat 52')).toBeInTheDocument();
    expect(screen.getByText('Bewoner')).toBeInTheDocument();

    // Toggle a notification category off
    const bezorgingSwitch = await screen.findByRole('switch', { name: 'Bezorging' });
    expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(bezorgingSwitch);
    await waitFor(() => expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'false'));
    expect(pushSettings).toEqual({ bezorging: false });

    // "Reload": unmount and mount a fresh App — the toggle must still be off
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Profiel'));
    const reloadedSwitch = await screen.findByRole('switch', { name: 'Bezorging' });
    expect(reloadedSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('persists a language switch after reload', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Profiel'));

    expect(await screen.findByText('Adres')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('Address')).toBeInTheDocument();
    expect(localStorage.getItem('lang')).toBe('en');

    // "Reload": unmount and mount a fresh App — language must still be English
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Profiel'));
    expect(await screen.findByText('Address')).toBeInTheDocument();
  });
});
