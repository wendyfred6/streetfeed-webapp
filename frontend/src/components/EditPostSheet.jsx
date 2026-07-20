import NewPostSheet from './NewPostSheet.jsx';

// Thin adapter over the shared create/edit modal (2026-07-19) — see
// NewPostSheet.jsx's own comment for why these two used to be separate
// components with different chrome, and why that turned out not to match
// Figma. Keeping this as its own file/name means callers (App.jsx) don't
// need to change how they open an edit flow.
export default function EditPostSheet({ post, onClose, onSave, streetId, onError, user }) {
  return (
    <NewPostSheet
      post={post}
      streetId={streetId}
      onClose={onClose}
      onError={onError}
      user={user}
      onSubmit={(data) => onSave(post.id, data)}
    />
  );
}
