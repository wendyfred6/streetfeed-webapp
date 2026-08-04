import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HouseNumberPicker from './HouseNumberPicker.jsx';

// FRE-411 (pilot-blocking): a single transient fetch failure used to be
// cached as `[]` forever (module-level Map, no TTL) — indistinguishable
// from "this street genuinely has no addresses", recoverable only by a full
// page reload. These cover: automatic retry within one mount (no reload
// needed for a transient blip), no permanent cache poisoning across mounts
// (reopening the sheet — not reloading the page — recovers a sustained
// failure once the backend is healthy again), and a distinguishable error
// state if every retry in a mount genuinely fails.

const apiGet = vi.fn();
vi.mock('../api/client.js', () => ({
  api: { get: (...args) => apiGet(...args) },
}));

const ADDRESSES = ['1-hs', '1-1', '2-1', '2-2', '27-2', '28-2'];

describe('HouseNumberPicker (FRE-411)', () => {
  beforeEach(() => { apiGet.mockReset(); });

  // Each test uses a distinct streetId — HouseNumberPicker's addressCache is
  // a module-level Map keyed by streetId (that's the exact thing under test
  // here), so it persists across `it()` blocks within this file the same
  // way it persists across component remounts in the real app. Reusing one
  // streetId across tests would let an earlier test's cached result leak
  // into a later one.

  it('shows the fetched house numbers on a normal successful load', async () => {
    apiGet.mockResolvedValue(ADDRESSES);
    render(<HouseNumberPicker streetId={101} value="" onChange={vi.fn()} />);

    const select = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(screen.getByRole('option', { name: '27' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '28' })).toBeInTheDocument();
  });

  it('self-heals a transient failure within one mount via automatic retry — no reload needed', async () => {
    apiGet
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValueOnce(ADDRESSES);
    render(<HouseNumberPicker streetId={102} value="" onChange={vi.fn()} />);

    const select = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(select).not.toBeDisabled(), { timeout: 3000 });
    expect(screen.getByRole('option', { name: '27' })).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledTimes(2);
  }, 5000);

  it('does not permanently poison the cache: a fresh mount after all retries fail still retries once the backend recovers', async () => {
    // First mount: every attempt fails (simulates a sustained outage during
    // the failed attempt itself).
    apiGet.mockRejectedValue(new Error('502'));
    const { unmount } = render(<HouseNumberPicker streetId={103} value="" onChange={vi.fn()} />);

    const select1 = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(select1).not.toBeDisabled(), { timeout: 3000 });
    expect(select1).toHaveTextContent('Kon niet laden');
    unmount();

    // Reopening the sheet (a fresh mount, NOT a page reload) after the
    // backend has recovered must retry from scratch, not replay the old
    // failure forever. Same streetId as above — this is the whole point.
    apiGet.mockReset();
    apiGet.mockResolvedValue(ADDRESSES);
    render(<HouseNumberPicker streetId={103} value="" onChange={vi.fn()} />);

    const select2 = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(select2).not.toBeDisabled());
    expect(screen.getByRole('option', { name: '27' })).toBeInTheDocument();
  }, 8000);

  it('shows a distinguishable error state, not a silent empty list, when every retry in a mount fails', async () => {
    apiGet.mockRejectedValue(new Error('502'));
    render(<HouseNumberPicker streetId={104} value="" onChange={vi.fn()} />);

    const select = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(select).not.toBeDisabled(), { timeout: 3000 });
    expect(select).toHaveTextContent('Kon niet laden');
    expect(select).not.toHaveTextContent('Kies');
  }, 5000);
});
