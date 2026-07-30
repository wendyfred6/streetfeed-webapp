import { COLORS, RADIUS } from '../design/tokens.js';

// Figma "OverflowMenu" (node 542:6822, re-verified 2026-07-30): solid
// opaque white, no blur/translucency, 20px radius (RADIUS.lg — the app's
// "floating card" scale, not the 28px reserved for full-width sheets/
// modals), 212px fixed width, 16px gap between items, 20px/16px padding.
// Elevation is Figma's own exact drop-shadow value for this component
// (0px 0px 4px rgba(0,0,0,0.08) — tighter/subtler than GLASS.card's shadow,
// no offset), not a reused token, distinct from the heavy modal shadow
// CategoryPicker/NewPostSheet use.
//
// Positioned by the caller via `style` (anchored near whatever trigger
// opened it, e.g. `{ position: 'absolute', top: '100%', right: 0 }` inside
// a `position: relative` wrapper) — this component doesn't know where its
// trigger is. Closes on any tap outside itself via a full-screen invisible
// backdrop, same idiom as ActionMenu.jsx.
export default function OverflowMenu({ children, onClose, style }) {
  return (
    <>
      <div data-testid="overflow-menu-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div
        style={{
          position: 'absolute', zIndex: 200,
          display: 'flex', flexDirection: 'column', gap: 16,
          width: 212, boxSizing: 'border-box',
          background: COLORS.background,
          borderRadius: RADIUS.lg,
          padding: '16px 20px',
          boxShadow: '0px 0px 4px rgba(0,0,0,0.08)',
          ...style,
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
