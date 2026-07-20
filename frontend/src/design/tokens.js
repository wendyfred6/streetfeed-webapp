// ─── Kleuren ────────────────────────────────────────────────────────────────────
// Figma Variables source of truth: W65VpyQHr5Zy5121TZk05t → Streetfeed Colors v1.0
export const COLORS = {
  // — Figma Variables —
  // Accent
  accent:         '#FF0066',             // Accent/Accent — CTA buttons, FAB, active states
  // Text
  text:           '#1C1A18',             // Text/Primary
  textMuted:      'rgba(28,26,24,0.65)', // Text/Secondary — supporting text
  textDim:        'rgba(28,26,24,0.40)', // Text/Tertiary — Category Path, metadata
  textInverse:    '#FFFFFF',             // Text/Inverse — tekst op donkere achtergrond
  // Border
  borderPrimary:   '#1C1A18',             // Border/Primary
  borderSecondary: 'rgba(28,26,24,0.65)', // Border/Secondary
  borderTertiary:  'rgba(28,26,24,0.40)', // Border/Tertiary
  // Background
  background:     '#FFFFFF',             // Background/Background
  // Surface
  // Surface/Tertiary — Category Picker, New/Edit Post Sheet Modal. Figma
  // specifies this as rgba(108,104,96,0.05), but that's a 5%-alpha color
  // meant to be read as composited onto an opaque white backing (how Figma
  // itself renders it) — used directly as a CSS `background` with no solid
  // layer under it, it let the dark overlay behind the modal show through
  // almost entirely (2026-07-19 regression). This is that same tint
  // pre-flattened onto white, so the modal stays a fully opaque, light
  // warm-grey surface: rgb(247,247,246).
  surfaceModal:   '#F7F7F6',
  // Feedback
  success:        '#3D7A43',             // Feedback/Success — toggle on, success states
  error:          '#C62828',             // Feedback/Error — validation errors, error states
  // Interaction (bewust los van Accent: onafhankelijk bij eventuele merkkleurwijziging)
  interactionLike:         '#FF0066',    // Interaction/Like — like-hartje
  interactionNotification: '#FF0066',    // Interaction/Notification — notificatiedot

  // — UI-specifiek (niet in Figma Variables) —
  bg:           'rgba(255,255,255,0.60)',
  surface:      'rgba(255,255,255,0.75)',
  border:       'rgba(255,0,102,0.15)',
  pinned:       'rgba(255,255,255,0.82)',
  pinnedBorder: 'rgba(255,0,102,0.22)',
  red:          '#FF4444',
  blue:         '#4488FF',
  orange:       '#FF8833',
  purple:       '#AA77FF',
  green:        '#44BB44',
};

// ─── Paginagradiënt ─────────────────────────────────────────────────────────────
// Doorgerekend op 40% opacity over wit (zelfde recept als index.html's
// body::before), zodat dit token overal waar het als platte achtergrond
// gebruikt wordt hetzelfde resultaat geeft zonder losse opacity-regel.
export const BG_GRADIENT = 'linear-gradient(160deg, #FFFCF4 0%, #FFE7E8 45%, #FFFEF5 73%, #FFF3F9 100%)';

// ─── Semitransparante varianten ──────────────────────────────────────────────────
export const ALPHA = {
  accentSubtle: 'rgba(255,0,102,0.08)',
  accentBorder: 'rgba(255,0,102,0.2)',
  terraGlow:    'rgba(255,0,102,0.30)',
};

// ─── Frosted glass presets ───────────────────────────────────────────────────────
export const GLASS = {
  card: {
    background:              'rgba(255,255,255,0.70)',
    backdropFilter:          'blur(20px)',
    WebkitBackdropFilter:    'blur(20px)',
    border:                  '1px solid rgba(255,255,255,0.50)',
    boxShadow:               '0 4px 24px rgba(0,0,0,0.06)',
  },
  header: {
    background:              'rgba(255,255,255,0.75)',
    backdropFilter:          'blur(20px)',
    WebkitBackdropFilter:    'blur(20px)',
  },
  sheet: {
    background:              'rgba(255,255,255,0.88)',
    backdropFilter:          'blur(30px)',
    WebkitBackdropFilter:    'blur(30px)',
  },
  input: {
    background:              'rgba(255,255,255,0.60)',
    backdropFilter:          'blur(10px)',
    WebkitBackdropFilter:    'blur(10px)',
  },
  subtle: {
    background:              'rgba(255,255,255,0.50)',
    backdropFilter:          'blur(8px)',
    WebkitBackdropFilter:    'blur(8px)',
  },
};

// ─── Border-radius schaal ────────────────────────────────────────────────────────
// xs   → badges, kleine accenten
// sm   → streetBadge, sub-badges
// md   → inputs, selects (14px per briefing)
// lg   → cards (20px per briefing)
// xl   → sheets, modals (28px per briefing)
// pill → alle knoppen en chips
export const RADIUS = {
  xs:   4,
  sm:   6,
  md:   14,
  lg:   20,
  xl:   28,
  pill: 999,
};

// ─── Typografieschaal ────────────────────────────────────────────────────────────
export const FONT = {
  '2xs': 10,   // labels, meta
  xs:    11,   // secundaire meta
  sm:    13,   // body-klein / meta
  md:    15,   // body-standaard
  base:  15,
  lg:    18,   // sheet-titels
  xl:    20,   // logo / detail-titels
  '2xl': 24,   // stat-nummers
};
