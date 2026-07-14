import { COLORS } from '../design/tokens.js';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';

export default function Chevron({ size = 14, color, rotate = 0, style }) {
  return (
    <CaretDownIcon size={size} color={color || COLORS.textMuted} weight="regular"
      style={{ flexShrink: 0, pointerEvents: 'none', transition: 'transform 0.2s', transform: `rotate(${rotate}deg)`, ...style }} />
  );
}
