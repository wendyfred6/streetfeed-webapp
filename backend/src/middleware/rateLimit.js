import rateLimit from 'express-rate-limit';

// Strict — this endpoint sends emails and is the main enumeration/abuse
// surface (no auth required, accepts any email address).
export const authRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Te veel pogingen — probeer het over 15 minuten opnieuw' },
});

// Looser — unauthenticated but only proxies/caches PDOK lookups typed
// interactively during onboarding, not a magic-link/email surface.
export const bagLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Te veel verzoeken — probeer het over 15 minuten opnieuw' },
});
