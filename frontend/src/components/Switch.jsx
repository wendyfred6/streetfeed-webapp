import { COLORS } from '../design/tokens.js';

const SIZES = {
  sm: { w: 36, h: 20, knob: 14, pad: 3 },
  lg: { w: 44, h: 26, knob: 20, pad: 3 },
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
  const { w, h, knob, pad } = SIZES[size];
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
          position: 'absolute', top: pad, left: checked ? w - knob - pad : pad,
          width: knob, height: knob, borderRadius: '50%',
          background: checked ? knobOnColor : knobOffColor,
          boxShadow: knobShadow ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
