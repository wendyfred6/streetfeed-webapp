import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from './OnboardingPage.jsx';

// FRE-361: the old flow let a first-time resident submit just an email on
// what looked like the only entry point, silently hitting the backend's
// anti-enumeration short-circuit (no token, no email sent) with no way to
// tell. Root entry point is now an explicit choice screen instead of a
// primary button + easy-to-miss secondary link.

vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn((path) => {
      if (path.startsWith('/bag/resolve-street')) return Promise.resolve({ streetId: 1, streetName: 'Reyer Anslostraat' });
      if (path.startsWith('/bag/addresses/')) return Promise.resolve(['52']);
      return Promise.resolve(null);
    }),
    post: vi.fn(() => Promise.resolve({ ok: true })),
  },
}));

describe('FRE-361: root choice screen', () => {
  beforeEach(async () => {
    const { api } = await import('../api/client.js');
    api.post.mockClear();
  });

  it('offers both an existing-account and a new-resident path, with no default action', async () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /magic link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account aanmaken|create account/i })).toBeInTheDocument();
    // Neither path's own screen (email field) exists yet — the choice must
    // be made first.
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('existing-account path shows login copy and sends only the email', async () => {
    const { api } = await import('../api/client.js');
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /magic link/i }));

    const emailInput = await screen.findByLabelText(/e-mail/i);
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /stuur magic link|send magic link/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/request', { email: 'existing@example.com' }));
  });

  it('new-resident path shows account-creation copy (not login) and does not call the API yet', async () => {
    const { api } = await import('../api/client.js');
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /account aanmaken|create account/i }));

    const emailInput = await screen.findByLabelText(/e-mail/i);
    expect(screen.queryByRole('button', { name: /stuur magic link|send magic link/i })).not.toBeInTheDocument();
    fireEvent.change(emailInput, { target: { value: 'resident@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));

    expect(await screen.findByLabelText(/postcode/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('drives the full registration wizard from the choice screen and actually sends the collected email', async () => {
    const { api } = await import('../api/client.js');
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /account aanmaken|create account/i }));
    fireEvent.change(await screen.findByLabelText(/e-mail/i), { target: { value: 'resident@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));

    fireEvent.change(await screen.findByLabelText(/postcode/i), { target: { value: '1000AA' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dit klopt' }));
    fireEvent.change(await screen.findByLabelText(/huisnummer/i), { target: { value: '52' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));
    fireEvent.change(await screen.findByLabelText(/naam|name/i), { target: { value: 'Testy' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /magic link/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/request', expect.objectContaining({
      email: 'resident@example.com',
    })));
  });
});

describe('FRE-234 verification: onboarding consent checkbox', () => {
  it('gates registration submission on the terms checkbox, and lets the user preview both documents first', async () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    // Step 0: choose the new-resident path, then enter an email
    fireEvent.click(screen.getByRole('button', { name: /account aanmaken|create account/i }));
    fireEvent.change(await screen.findByLabelText(/e-mail/i), { target: { value: 'resident2@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));

    // Step 1: postcode
    const postcodeInput = await screen.findByLabelText(/postcode/i);
    fireEvent.change(postcodeInput, { target: { value: '1000AA' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));

    // Step 2: confirm street
    fireEvent.click(await screen.findByRole('button', { name: 'Dit klopt' }));

    // Step 3: house number
    const numberSelect = await screen.findByLabelText(/huisnummer/i);
    fireEvent.change(numberSelect, { target: { value: '52' } });
    fireEvent.click(screen.getByRole('button', { name: /volgende|next/i }));

    // Step 4: name + consent
    const nameInput = await screen.findByLabelText(/naam|name/i);
    fireEvent.change(nameInput, { target: { value: 'Testy' } });

    const submitBtn = screen.getByRole('button', { name: /magic link/i });
    expect(submitBtn).toBeDisabled();

    // Preview both documents before agreeing
    fireEvent.click(screen.getByRole('button', { name: 'Voorwaarden' }));
    expect(await screen.findByText(/besloten platform/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    await waitFor(() => expect(screen.queryByText(/besloten platform/)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Privacybeleid' }));
    expect(await screen.findByText(/AVG-verwerkingsverantwoordelijke/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));

    // Still disabled — checkbox not checked yet
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(submitBtn).not.toBeDisabled();
  });
});
