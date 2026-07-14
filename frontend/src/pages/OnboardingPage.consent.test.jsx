import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from './OnboardingPage.jsx';

// FRE-234: registration ("akkoord vereist") must not complete without the
// terms/privacy checkbox — and residents need to be able to actually read
// both documents before agreeing, not just take it on faith. Drives the
// whole registration wizard (no prior test coverage existed for it at all)
// since the consent gate lives on its final step.

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

describe('FRE-243 PO smoke test blocker: "Nieuw hier?" requires an email first', () => {
  it('blocks navigation to the registration wizard and shows a validation error when the email field is empty', async () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    fireEvent.click(screen.getByText(/nieuw hier|new here/i));

    // Must NOT have navigated to the postcode step
    expect(screen.queryByLabelText(/postcode/i)).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mailadres/i);
  });

  it('proceeds to the registration wizard once a valid email is entered, and actually sends it', async () => {
    const { api } = await import('../api/client.js');
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    const emailInput = screen.getByLabelText(/e-mail/i);
    fireEvent.change(emailInput, { target: { value: 'resident@example.com' } });
    fireEvent.click(screen.getByText(/nieuw hier|new here/i));

    expect(await screen.findByLabelText(/postcode/i)).toBeInTheDocument();

    // Drive the rest of the wizard and confirm the email actually reaches
    // the backend — a mock that always resolves ok wouldn't have caught
    // the original bug (the request went out with an empty email and the
    // real backend rejected it; this mock can't distinguish that unless we
    // assert on what was actually sent).
    fireEvent.change(screen.getByLabelText(/postcode/i), { target: { value: '1000AA' } });
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

    // Step 0: enter an email, then go to "new here" (registration) flow —
    // required since FRE-243's smoke test found "Nieuw hier?" didn't work
    // at all without one.
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'resident2@example.com' } });
    fireEvent.click(screen.getByText(/nieuw hier|new here/i));

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
