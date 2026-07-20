import { COLORS, RADIUS } from '../design/tokens.js';

// Single shared confirmation pattern (Figma "Confirmation Patterns v0.1",
// 2026-07-19) for both variants: Destructive (e.g. deleting a post) and
// Unsaved Changes (e.g. closing Edit Post with edits pending). Only the
// copy and which action is primary differ — same component either way, so
// the two flows can't drift apart the way EditPostSheet's old bottom-sheet
// chrome did from New Post Sheet's modal.
//
// Sits on top of whatever triggered it (Post Detail, or the still-open Edit
// Post Sheet) rather than replacing it — the caller keeps its own screen
// mounted underneath, dimmed by this component's scrim.
//
// Deliberately no tap-outside-to-dismiss: both variants guard against losing
// something (data or work), so resolving them always requires an explicit
// button tap, not an easy-to-trigger-by-accident scrim tap.
//
// True bottom sheet, not a floating card (2026-07-19 revision) — Figma's
// updated pattern has no border on the sheet itself, just a flat opaque
// white block flush to the viewport's bottom edge, with the scrim as a
// separate full-screen layer behind it. The earlier accent-pink border
// around the whole sheet read as a card floating above the bottom edge
// instead of a sheet anchored to it — removed entirely, not replaced.
export default function ConfirmationSheet({ heading, body, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: COLORS.background, borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{heading}</div>
          <div style={{ fontSize: 12, color: COLORS.text, lineHeight: '18px' }}>{body}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onPrimary} style={{ width: '100%', height: 48, background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            {primaryLabel}
          </button>
          <button onClick={onSecondary} style={{ width: '100%', height: 48, background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.borderPrimary}`, borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
