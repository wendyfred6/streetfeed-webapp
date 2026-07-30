import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { COLORS } from '../design/tokens.js';

// Figma "CommentItem" (node 23:7836, updated 2026-07-30): the visible
// OverflowMenuButton is items-center/justify-end inside a 24x24 footprint —
// the dots sit flush with the footprint's own right edge, vertically
// centered. Since the footprint is the row's last flex child, that right
// edge already equals the row's right edge, which already equals the
// timestamp's right edge below — "right-aligned with the timestamp" falls
// out of matching Figma exactly, not a separate thing to solve.
//
// The 44x44 transparent touch target is real (per the original OverflowMenu
// spec) and stays intact, but must never affect layout: anchored flush to
// the footprint's own right+bottom edges (not centered on it), extending
// only left and up — into the card's own padding/the 4px row gap, never
// into content, and never shifting the visible dots off Figma's position.
//
// Phosphor's icon SVGs use viewBox="0 0 256 256" — DotsThreeVertical's dots
// are drawn centered in that box (x=128±16), so at render size 24 the
// visible glyph's right edge sits 10.5px left of the SVG element's own
// right edge (measured: (256-144)/256 * 24 = 10.5, confirmed via
// path.getBoundingClientRect() against the rendered page). justify-end
// alone only right-aligns the SVG's empty box, not the glyph drawn inside
// it — translateX(10.5px) compensates so the actual painted dots land
// flush with the footprint's edge, matching Figma exactly.
export default function OverflowMenuButton({ onClick, ariaLabel }) {
  return (
    <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{
          position: 'absolute', right: 0, bottom: 0,
          width: 44, height: 44,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: COLORS.textMuted,
        }}
      >
        <DotsThreeVerticalIcon size={24} weight="bold" style={{ transform: 'translateX(10.5px)' }} />
      </button>
    </div>
  );
}
