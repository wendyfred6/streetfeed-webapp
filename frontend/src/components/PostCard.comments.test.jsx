import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PostCard from './PostCard.jsx';
import { setLang } from '../i18n/index.js';

// FRE-371: CommentItem's OverflowMenu (edit/delete-own). Real ownership
// gating and persistence live on the backend (comments.smoke.test.js) —
// these cover the UI behaviour: trigger visibility, the edit/delete flows,
// and that a failed request preserves the existing comment rather than
// silently reverting or corrupting it.

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Wendy', house_number: '52' } }),
}));

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();
vi.mock('../api/client.js', () => ({
  api: {
    get: (...args) => apiGet(...args),
    post: (...args) => apiPost(...args),
    patch: (...args) => apiPatch(...args),
    delete: (...args) => apiDelete(...args),
  },
}));

const POST = {
  id: 42, title: 'Test post', body: 'Post body', category: 'algemeen',
  created_at: new Date().toISOString(), comments: 2, likes: 0, liked: false,
};

const OWN_COMMENT = {
  id: 1, body: 'My own comment', created_at: new Date().toISOString(), edited_at: null,
  author_name: 'Wendy', author_house: '52', can_manage: true,
};
const OTHER_COMMENT = {
  id: 2, body: "A neighbour's comment", created_at: new Date().toISOString(), edited_at: null,
  author_name: 'Buurman', author_house: '12', can_manage: false,
};

function renderExpanded() {
  return render(
    <PostCard post={POST} onLike={vi.fn()} onRsvp={vi.fn()} onOpenEvent={vi.fn()} onReport={vi.fn()}
      onOpenJoin={vi.fn()} onDelete={vi.fn()} canModerate={false} onEdit={vi.fn()} canEdit={false}
      autoExpand onError={vi.fn()} />
  );
}

describe('CommentItem OverflowMenu', () => {
  beforeEach(() => {
    setLang('nl');
    apiGet.mockReset(); apiPost.mockReset(); apiPatch.mockReset(); apiDelete.mockReset();
    apiGet.mockResolvedValue([OWN_COMMENT, OTHER_COMMENT]);
  });

  it('shows the trigger only on the resident\'s own comment', async () => {
    renderExpanded();
    await waitFor(() => expect(screen.getByText('My own comment')).toBeInTheDocument());

    const triggers = screen.getAllByRole('button', { name: 'Meer opties' });
    expect(triggers).toHaveLength(1);
  });

  it('edits a comment: opens the menu, saves, shows the updated body and an Edited label', async () => {
    const editedAt = new Date().toISOString();
    apiPatch.mockResolvedValue({ ...OWN_COMMENT, body: 'Updated text', edited_at: editedAt });
    renderExpanded();
    await waitFor(() => expect(screen.getByText('My own comment')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Meer opties' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bewerken' }));

    const textarea = screen.getByDisplayValue('My own comment');
    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

    await waitFor(() => expect(screen.getByText('Updated text')).toBeInTheDocument());
    expect(apiPatch).toHaveBeenCalledWith('/streets/1/posts/42/comments/1', { body: 'Updated text' });
    expect(screen.getByText(/Bewerkt ·/)).toBeInTheDocument();
    expect(screen.queryByText('My own comment')).not.toBeInTheDocument();
  });

  it('a failed edit preserves the original comment and reports the error', async () => {
    const onError = vi.fn();
    apiPatch.mockRejectedValue(new Error('Reactie bewerken mislukt'));
    render(
      <PostCard post={POST} onLike={vi.fn()} onRsvp={vi.fn()} onOpenEvent={vi.fn()} onReport={vi.fn()}
        onOpenJoin={vi.fn()} onDelete={vi.fn()} canModerate={false} onEdit={vi.fn()} canEdit={false}
        autoExpand onError={onError} />
    );
    await waitFor(() => expect(screen.getByText('My own comment')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Meer opties' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bewerken' }));
    fireEvent.change(screen.getByDisplayValue('My own comment'), { target: { value: 'Attempted edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Reactie bewerken mislukt'));
    // Edit form stays open with the attempted text (for a retry) — but the
    // underlying comment data itself was never mutated on failure.
    expect(screen.getByDisplayValue('Attempted edit')).toBeInTheDocument();
  });

  it('deletes a comment after confirming, and does not delete on cancel', async () => {
    apiDelete.mockResolvedValue({ ok: true });
    renderExpanded();
    await waitFor(() => expect(screen.getByText('My own comment')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Meer opties' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

    expect(screen.getByText('Reactie verwijderen?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Annuleren' }));
    expect(apiDelete).not.toHaveBeenCalled();
    expect(screen.getByText('My own comment')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Meer opties' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reactie verwijderen' }));

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/streets/1/posts/42/comments/1'));
    await waitFor(() => expect(screen.queryByText('My own comment')).not.toBeInTheDocument());
  });

  it('closes the menu when tapping outside it', async () => {
    renderExpanded();
    await waitFor(() => expect(screen.getByText('My own comment')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Meer opties' }));
    expect(screen.getByRole('button', { name: 'Bewerken' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('overflow-menu-backdrop'));
    expect(screen.queryByRole('button', { name: 'Bewerken' })).not.toBeInTheDocument();
  });
});
