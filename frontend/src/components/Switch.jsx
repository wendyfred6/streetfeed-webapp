import { COLORS } from '../design/tokens.js';

// `knobW`/`knobH` are separate (not a single `knob` size) so a track can
// hold a non-circular, pill-shaped knob — needed by the Account page's
// notification toggles (Figma: 48x24 track, 24x16 knob), which existing
// `sm`/`lg` (circular knob) couldn't represent.
const SIZES = {
  sm: { w: 36, h: 20, knobW: 14, knobH: 14, pad: 3 },
  lg: { w: 44, h: 26, knobW: 20, knobH: 20, pad: 3 },
  md: { w: 48, h: 24, knobW: 24, knobH: 16, pad: 4 },
};

export default function Switch({
  checked,
  onChange,
  label,
  size = 'sm',
  trackOnColor = COLORS.accent,
  trackOffColor = COLORS.border,
  knobOnColor = '#000',
  knobOffColor = COLORS.textDim,
  knobShadow = false,
  disabled = false,
  style,
}) {
  const { w, h, knobW, knobH, pad } = SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: w, height: h, borderRadius: h / 2,
        background: checked ? trackOnColor : trackOffColor,
        border: 'none', padding: 0, position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute', top: (h - knobH) / 2, left: checked ? w - knobW - pad : pad,
          width: knobW, height: knobH, borderRadius: knobH / 2,
          background: checked ? knobOnColor : knobOffColor,
          boxShadow: knobShadow ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
