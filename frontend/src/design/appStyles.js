// Shared component-level styles used across App.jsx and the extracted
// post-form components (CategoryPicker/NewPostSheet/EditPostSheet and the
// sheets that remain in App.jsx). Moved out of App.jsx (FRE-316) so the
// extracted components don't need to import back from App.jsx.
import { COLORS, RADIUS, ALPHA, GLASS } from './tokens.js';
import { CATEGORIES } from '../utils/categories.js';

// Header's own content row (logo + the 36px icon buttons) is 16px of top/
// bottom padding around a 36px-tall row — kept as named numbers, not just
// inlined into the calc() strings below, so `header` and `headerSpacer`
// can't drift apart if this ever changes.
const HEADER_PAD_Y = 16;
const HEADER_CONTENT_HEIGHT = 36;
const HEADER_HEIGHT = `calc(${HEADER_PAD_Y * 2 + HEADER_CONTENT_HEIGHT}px + env(safe-area-inset-top))`;

export const s = {
  app: { fontFamily: "'Inter','Helvetica Neue',sans-serif", background: 'transparent', color: COLORS.text, minHeight: '100vh', maxWidth: 390, margin: '0 auto' },
  // Fixed (not sticky) so the frosted background genuinely extends behind
  // the iOS status bar/Dynamic Island (viewport-fit=cover in index.html
  // already lets the page draw there) and so feed content can scroll
  // underneath it, dimly visible through the blur, instead of stopping dead
  // at the header's edge the way an in-flow sticky header would (2026-07-20,
  // refined per Figma/UX request — content must start below the header on
  // load, but may pass behind it once scrolled). `headerSpacer` below is the
  // matching reserved space for the content that follows.
  header: { ...GLASS.header, borderBottom: '1px solid rgba(255,255,255,0.3)', padding: `calc(${HEADER_PAD_Y}px + env(safe-area-inset-top)) 20px ${HEADER_PAD_Y}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, zIndex: 50 },
  // Unconditional spacer rendered once, right after the header, ahead of
  // every tab's content — since the header is now `fixed` (out of flow),
  // this is what keeps content from appearing underneath/above it on load.
  headerSpacer: { height: HEADER_HEIGHT, flexShrink: 0 },
  logo: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' },
  accent: { color: COLORS.accent },
  headerActions: { display: 'flex', alignItems: 'center', gap: 4 },
  headerIconBtn: (active) => ({ width: 36, height: 36, background: active ? ALPHA.accentSubtle : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: RADIUS.pill, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? COLORS.accent : COLORS.textMuted }),
  feed: { padding: '0 0 calc(98px + env(safe-area-inset-bottom)) 0' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textMuted, padding: '16px 20px 8px' },
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 },
  pinnedBadge: { background: COLORS.accent, color: COLORS.textInverse, fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: RADIUS.xs },
  endDateBadge: { fontSize: 10, color: COLORS.accent, background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.xs, padding: '2px 6px' },
  filterBar: { display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' },
  filterChip: (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, background: active ? COLORS.accent : 'rgba(255,255,255,0.55)', color: active ? COLORS.textInverse : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '5px 12px', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  bottomBar: { position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 28px)', maxWidth: 374, display: 'flex', alignItems: 'center', zIndex: 50 },
  tabBar: { ...GLASS.header, border: '1px solid rgba(255,255,255,0.55)', borderRadius: RADIUS.pill, padding: '5px', display: 'flex', flex: '1 1 auto' },
  tab: (active) => ({ flex: 1, padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? ALPHA.accentSubtle : 'none', border: 'none', borderRadius: RADIUS.pill, cursor: 'pointer', color: active ? COLORS.accent : COLORS.textMuted, transition: 'background 0.15s' }),
  postCta: (visible) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: visible ? 54 : 0, height: 54, marginLeft: visible ? 10 : 0,
    background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill,
    cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
    opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.4)',
    boxShadow: visible ? `0 4px 20px ${ALPHA.terraGlow}` : 'none',
    transition: 'width 0.28s ease, margin-left 0.28s ease, opacity 0.18s ease, transform 0.28s ease, box-shadow 0.28s ease',
    pointerEvents: visible ? 'auto' : 'none',
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,10,18,0.50)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { ...GLASS.sheet, borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto', touchAction: 'pan-y', overscrollBehaviorX: 'none' },
  sheetHandle: { width: 36, height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 2, margin: '0 auto 20px' },
  sheetTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.3px' },
  sheetBackRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  sheetBackBtn: { background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: RADIUS.pill, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.text, flexShrink: 0 },
  input: { width: '100%', ...GLASS.input, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 10 },
  textarea: { width: '100%', ...GLASS.input, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', resize: 'none', minHeight: 80, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textDim, display: 'block', marginBottom: 6 },
  catGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  catOption: (selected, cat) => ({ background: selected ? `${CATEGORIES[cat]?.color}18` : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${selected ? CATEGORIES[cat]?.color : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400, whiteSpace: 'nowrap' }),
  // Primary/Secondary Action — aligned to Figma Pattern Library v0.1's
  // Actions section (node 241:25340, FRE-380): height 48, weight 500,
  // font-size 16; Secondary is a 1px border on a plain background, not the
  // frosted-glass look these predate.
  submitBtn: { width: '100%', height: 48, background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
  cancelBtn: { width: '100%', height: 48, background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.borderPrimary}`, borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 11, fontWeight: 700, padding: '2px 7px' }),
  infoBox: { ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 10 },
  adminCard: { ...GLASS.card, borderRadius: RADIUS.lg, padding: '14px 16px', marginBottom: 8 },
  statRow: { display: 'flex', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, ...GLASS.card, borderRadius: RADIUS.lg, padding: '12px', textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 800, color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  streetCard: { margin: '0 12px 8px', ...GLASS.card, borderRadius: RADIUS.lg, padding: '16px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: 15 },
  reportBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer', padding: 0 },
};
