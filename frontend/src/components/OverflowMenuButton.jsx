import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { COLORS } from '../design/tokens.js';

// Figma "CommentItem" (node 23:7836, re-verified 2026-07-30): the button's
// own slot in the ContentMeta row is 24x24, shrink-0 — it must not inflate
// that row's height. The 44x44 transparent touch target is real (per the
// original OverflowMenu spec) and stays intact, but as a <button>
// positioned over a 24x24, non-interactive, in-flow wrapper.
//
// Deliberately asymmetric, not centered on the wrapper: CommentItem has 0
// gap between this row and the comment body directly below (also per
// 23:7836). A target centered on the 24px footprint would extend 10px below
// it — verified via getClientRects() on real rendered text that a
// multi-line comment's first line then visibly overlaps that 10px band.
// Anchoring the target's bottom edge flush with the footprint's bottom
// (extending the full 20px upward instead, into the card's own padding,
// never into content) keeps the dots glyph at the exact same page position
// Figma specifies — alignItems: flex-end lands it in the footprint's own
// 24px, not centered in the enlarged 44px box — while guaranteeing zero
// overlap with comment text below, regardless of comment length.
export default function OverflowMenuButton({ onClick, ariaLabel }) {
  return (
    <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 44, height: 44,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: COLORS.textMuted,
        }}
      >
        <DotsThreeVerticalIcon size={24} weight="bold" />
      </button>
    </div>
  );
}
