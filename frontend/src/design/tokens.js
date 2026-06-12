// ─── Kleuren ────────────────────────────────────────────────────────────────────
export const COLORS = {
  bg:           '#F5D5B8',              // warm perzik — fills, inactive chips
  surface:      'rgba(255,255,255,0.75)', // frosted glass basisoppervlak
  border:       'rgba(255,0,102,0.15)',  // subtiele roze rand
  accent:       '#FF0066',              // Electric Pink — labels, CTA, actieve states
  terracotta:   '#FF0066',              // zelfde als accent (Electric Pink vervangt terracotta)
  text:         '#1A0A12',              // primaire tekst
  textMuted:    '#6B3050',              // secundaire tekst
  textDim:      '#4A2035',              // dimmere tekst
  pinned:       'rgba(255,0,102,0.05)', // vastgepinde kaart achtergrond
  pinnedBorder: 'rgba(255,0,102,0.2)',  // vastgepinde kaart rand
  red:          '#FF4444',
  blue:         '#4488FF',
  orange:       '#FF8833',
  purple:       '#AA77FF',
  green:        '#44BB44',
};

// ─── Paginagradiënt ─────────────────────────────────────────────────────────────
export const BG_GRADIENT = 'radial-gradient(ellipse at 60% 40%, #F5D5B8 0%, #F0C49A 40%, #EDD884 100%)';

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
