import { COLORS } from '../design/tokens.js';
import { ChevronDownIcon } from '../icons/index.jsx';

export default function Chevron({ size = 14, color, rotate = 0, style }) {
  return (
    <ChevronDownIcon size={size} color={color || COLORS.textMuted}
      style={{ flexShrink: 0, pointerEvents: 'none', transition: 'transform 0.2s', transform: `rotate(${rotate}deg)`, ...style }} />
  );
}
