// Shared author/moderator check — previously copy-pasted 3x across the
// edit/delete/resolve routes (FRE-319). Works for any resource with a
// user_id (posts, comments), not just posts.
export function isAuthorOrModerator(post, req) {
  return isAuthor(post, req) || isModerator(req);
}

export function isAuthor(resource, req) {
  return resource.user_id === req.user.user_id;
}

export function isModerator(req) {
  return req.user.is_super_admin || ['admin', 'moderator'].includes(req.membership?.role);
}
