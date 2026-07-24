import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App.jsx';
import { setLang } from './i18n/index.js';

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
let patchShouldFail = false;

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
      if (path === '/push/settings') {
        if (patchShouldFail) return Promise.reject(new Error('Netwerkfout'));
        Object.assign(pushSettings, body.settings);
      }
      return Promise.resolve(null);
    }),
    delete: vi.fn(() => Promise.resolve(null)),
  },
}));

describe('Account page smoke test (M5 DoD, updated for the FRE-392 Account redesign)', () => {
  beforeEach(() => {
    pushSettings = {};
    patchShouldFail = false;
    localStorage.removeItem('lang');
    // i18n/index.js's currentLang is a module-level singleton that only
    // updates via setLang() — clearing localStorage alone doesn't reset it,
    // so a language switch in one test leaks into whichever test runs next.
    setLang('nl');
  });

  it('loads the Account page with correct data, and a notification toggle persists after reload', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Account'));

    // Account page loads with correct data — role is deliberately not shown
    // here anymore (FRE-392: Figma's Account identity card is name/address/
    // email only), so this no longer asserts a role label like the old
    // Profile page did.
    expect(await screen.findByText('Wendy')).toBeInTheDocument();
    expect(screen.getByText('Reyer Anslostraat 52')).toBeInTheDocument();

    // Toggle a notification category off
    const bezorgingSwitch = await screen.findByRole('switch', { name: 'Bezorging' });
    expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(bezorgingSwitch);
    await waitFor(() => expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'false'));
    expect(pushSettings).toEqual({ bezorging: false });

    // "Reload": unmount and mount a fresh App — the toggle must still be off
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Account'));
    const reloadedSwitch = await screen.findByRole('switch', { name: 'Bezorging' });
    expect(reloadedSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('persists a language switch after reload', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Account'));

    // The Account page's identity card no longer has a separate "Adres"
    // label (FRE-392: Figma shows the address value directly, unlabeled) —
    // a category label is the reliable per-language text left on this page.
    expect(await screen.findByText('Bezorging')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('Package')).toBeInTheDocument();
    expect(localStorage.getItem('lang')).toBe('en');

    // "Reload": unmount and mount a fresh App — language must still be English
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Account'));
    expect(await screen.findByText('Package')).toBeInTheDocument();
  });

  // FRE-348: this used to be a bare .catch(() => {}) — the toggle stayed
  // visually flipped even when the server never got the change.
  it('reverts the toggle and surfaces an error toast when the settings patch fails', async () => {
    patchShouldFail = true;
    render(<App />);
    fireEvent.click(screen.getByLabelText('Account'));

    const bezorgingSwitch = await screen.findByRole('switch', { name: 'Bezorging' });
    expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(bezorgingSwitch);

    // Rolls back to the pre-toggle state once the patch rejects, rather than
    // silently keeping a change the server never received.
    await waitFor(() => expect(bezorgingSwitch).toHaveAttribute('aria-checked', 'true'));
    expect(await screen.findByText('Netwerkfout')).toBeInTheDocument();
  });
});
