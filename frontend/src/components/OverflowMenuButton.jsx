import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { COLORS } from '../design/tokens.js';

// Transparent 44x44 touch target around a small glyph — not spec'd in
// Figma (node 542:6822 only covers the menu itself), sized to the app's
// general minimum tap-target convention.
export default function OverflowMenuButton({ onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44, height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: COLORS.textMuted,
      }}
    >
      <DotsThreeVerticalIcon size={24} weight="bold" />
    </button>
  );
}
