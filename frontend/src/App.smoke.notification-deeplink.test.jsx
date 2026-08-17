import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';

// FRE-384: an admin "new request" notification carries a url (/?admin=queue)
// but no post_id — tappability now follows `url`, not `post_id`, and
// handleDeepLink's new ?admin=queue branch needs to land on the Account
// page. This covers the whole in-app path: tap the bell, tap the
// notification, land on Account. A separate backend test suite
// (fre384.notification-navigability.test.js) covers the url/post_id
// nulling logic this relies on being correct server-side.

window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();

const ADMIN_QUEUE_NOTIF = {
  id: 1,
  category: 'mandatory',
  title: 'Nieuwe aanvraag',
  body: 'Testresident (nr. 12) wil zich aanmelden.',
  url: '/?admin=queue',
  post_id: null,
  read_at: null,
  created_at: new Date().toISOString(),
};

vi.mock('./hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Wendy', house_number: '52', is_super_admin: true, memberships: [{ streetId: 1, status: 'approved', role: 'admin' }] },
    logout: vi.fn(),
  }),
}));

vi.mock('./api/client.js', () => ({
  api: {
    get: vi.fn((path) => {
      if (path === '/streets/1/posts') return Promise.resolve([]);
      if (path === '/streets/1') return Promise.resolve({ id: 1, name: 'Reyer Anslostraat', members: 12, households: 85 });
      if (path === '/notifications/unread-count') return Promise.resolve({ count: 1 });
      if (path === '/notifications') return Promise.resolve([ADMIN_QUEUE_NOTIF]);
      if (path === '/streets/1/pending') return Promise.resolve([]);
      if (path === '/streets/1/members') return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    post: vi.fn(() => Promise.resolve(null)),
    patch: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve(null)),
  },
}));

describe('FRE-384: admin-queue notification deep link', () => {
  it('a notification with a url but no post_id is tappable and navigates to Account', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Notificaties' }));

    const notifButton = await screen.findByRole('button', { name: /Nieuwe aanvraag/ });
    fireEvent.click(notifButton);

    // Lands on the Account page — the street stats card only renders there.
    await waitFor(() => expect(screen.getByText('Reyer Anslostraat')).toBeInTheDocument());
  });
});
