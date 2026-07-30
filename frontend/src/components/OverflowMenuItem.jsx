import { COLORS } from '../design/tokens.js';

// Figma "OverflowMenu" (node 542:6822): Body/M (16/24 Regular), icon 24px,
// gap 8px, error token for destructive items. Updated spec (2026-07-30):
// items use Fill container (172px within the 212px menu) and a 44px height
// with the full row clickable, not just the icon/text — a <button> filling
// the row satisfies both.
export default function OverflowMenuItem({ icon: Icon, label, onClick, destructive = false, disabled = false }) {
  const color = destructive ? COLORS.error : COLORS.text;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', height: 44,
        background: 'none', border: 'none', padding: 0,
        fontFamily: 'inherit', fontSize: 16, fontWeight: 400, lineHeight: '24px',
        color, textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={24} weight="regular" color={color} style={{ flexShrink: 0 }} />
      {label}
    </button>
  );
}
