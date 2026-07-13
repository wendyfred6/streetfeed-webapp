import rateLimit from 'express-rate-limit';

// Production sits behind Cloudflare Tunnel -> frontend nginx -> this backend.
// Express has no `trust proxy` configured (and getting the exact hop count
// right for a tunnel is its own source of bugs), so the default req.ip-based
// keying resolves to the frontend container's own docker-network address for
// every single visitor — turning these into one shared bucket for the whole
// site instead of a per-visitor limit (found via FRE-346).
// `CF-Connecting-IP` is set once, reliably, by Cloudflare's edge and passed
// through untouched by both cloudflared and nginx, so read it directly
// instead of trying to trust N proxy hops. Falls back to req.ip for local
// dev / anything not behind Cloudflare, where it already works correctly.
export function clientIp(req) {
  return req.headers['cf-connecting-ip'] || req.ip;
}

// Strict — this endpoint sends emails and is the main enumeration/abuse
// surface (no auth required, accepts any email address).
export const authRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIp,
  message: { error: 'Te veel pogingen — probeer het over 15 minuten opnieuw' },
});

// Looser — unauthenticated but only proxies/caches PDOK lookups typed
// interactively during onboarding, not a magic-link/email surface.
export const bagLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIp,
  message: { error: 'Te veel verzoeken — probeer het over 15 minuten opnieuw' },
});
