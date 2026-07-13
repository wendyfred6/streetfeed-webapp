// Shared author/moderator check — previously copy-pasted 3x across the
// edit/delete/resolve routes (FRE-319).
export function isAuthorOrModerator(post, req) {
  const isAuthor = post.user_id === req.user.user_id;
  const canMod = req.user.is_super_admin || ['admin', 'moderator'].includes(req.membership?.role);
  return isAuthor || canMod;
}
