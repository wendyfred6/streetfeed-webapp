export const COLORS = {
  bg:           '#F0F2EC', // pagina achtergrond, inactieve pill fill
  surface:      '#FFFFFF', // kaarten, header, secondary button fill
  border:       '#C8D0C0', // alle randen
  accent:       '#4A5E3A', // legergroen — logo, actieve pills, navigatie
  terracotta:   '#C4704A', // primary button, links, RSVP-acties
  text:         '#1C2418', // primaire tekst
  textMuted:    '#706B65', // secundaire tekst, meta-informatie, tijdstempels
  textDim:      '#4D4844', // dimme body tekst, placeholders
  pinned:       '#E4EDE0', // achtergrond vastgepinde kaarten
  pinnedBorder: '#B8C8B0', // rand vastgepinde kaarten
  red:          '#FF4444',
  blue:         '#4488FF',
  orange:       '#FF8833',
  purple:       '#AA77FF',
  green:        '#44BB44',
};

// Semitransparante varianten — voor fills, borders en glows
export const ALPHA = {
  accentSubtle: 'rgba(74,94,58,0.08)',
  accentBorder: 'rgba(74,94,58,0.2)',
  terraGlow:    'rgba(196,112,74,0.25)',
};

// Border-radius schaal
// xs  → badges, kleine accenten
// sm  → sub-badges, streetBadge
// md  → inputs, selects, kleine actie-knoppen
// lg  → cards (10px per briefing)
// xl  → sheets, overlays (16px)
// pill → alle knoppen en chips (999px per briefing)
export const RADIUS = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   10,
  xl:   16,
  pill: 999,
};

export const FONT = {
  '2xs': 10,  // labels, meta
  xs:    11,  // secundaire meta
  sm:    13,  // body-klein / meta (was 12, +1 per briefing)
  md:    15,  // body-standaard (was 13/14, +1-2 per briefing)
  base:  15,
  lg:    18,  // sheet-titels
  xl:    20,  // logo / detail-titels
  '2xl': 24,  // stat-nummers
};
