import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App.jsx';

// jsdom doesn't implement scrollTo — App/SegmentedControl call it on mount.
window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();

// M2's Definition-of-Done check: feed loads with posts, a post card
// expands, and a comment can be posted and appears. See FRE-315.

const POST = {
  id: 1,
  category: 'algemeen',
  sub_type: null,
  title: 'Wie heeft mijn ladder gezien?',
  body: 'Stond gisteren nog tegen de schutting.',
  author_name: 'Wendy',
  author_house: '52',
  created_at: new Date().toISOString(),
  likes: 0,
  liked: false,
  comments: 0,
  pinned: false,
};

const NEW_COMMENT = { id: 99, body: 'Ik heb hem gezien bij nr. 12!', created_at: new Date().toISOString() };

vi.mock('./hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Wendy', house_number: '52', is_super_admin: true, memberships: [{ streetId: 1, status: 'approved', role: 'admin' }] },
    logout: vi.fn(),
  }),
}));

vi.mock('./api/client.js', () => ({
  api: {
    get: vi.fn((path) => {
      if (path === '/streets/1/posts') return Promise.resolve([POST]);
      if (path === '/streets/1') return Promise.resolve({ id: 1, name: 'Reyer Anslostraat', members: 12, households: 111 });
      if (path === '/notifications/unread-count') return Promise.resolve({ count: 0 });
      if (path === '/streets/1/posts/1/comments') return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    post: vi.fn((path) => {
      if (path === '/streets/1/posts/1/comments') return Promise.resolve(NEW_COMMENT);
      return Promise.resolve(null);
    }),
    patch: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve(null)),
  },
}));

describe('Feed & Comments smoke test (M2 DoD)', () => {
  it('loads the feed, expands a post, and posts a comment that appears', async () => {
    render(<App />);

    // Feed loads with posts
    expect(await screen.findByText('Wie heeft mijn ladder gezien?')).toBeInTheDocument();
    expect(screen.queryByText('Stond gisteren nog tegen de schutting.')).not.toBeInTheDocument();

    // Post card expands
    fireEvent.click(screen.getByRole('button', { name: /Wie heeft mijn ladder gezien/ }));
    expect(await screen.findByText('Stond gisteren nog tegen de schutting.')).toBeInTheDocument();

    // Comment can be posted and appears
    const input = await screen.findByPlaceholderText('Reageer…');
    fireEvent.change(input, { target: { value: NEW_COMMENT.body } });
    fireEvent.click(screen.getByRole('button', { name: 'Stuur' }));

    await waitFor(() => expect(screen.getByText(NEW_COMMENT.body)).toBeInTheDocument());
  });
});
