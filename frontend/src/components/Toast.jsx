import { COLORS } from '../design/tokens.js';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const { message, borderColor = COLORS.accent, textColor = COLORS.text, dismissible = false, wrap = false } = toast;

  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      background: COLORS.surface, border: `1px solid ${borderColor}`, borderRadius: 10,
      padding: dismissible ? '14px 36px 14px 16px' : '10px 20px',
      fontSize: 13, color: textColor, zIndex: 200,
      ...(wrap
        ? { width: 'calc(100% - 40px)', maxWidth: 320, textAlign: 'left', lineHeight: 1.5 }
        : { whiteSpace: 'nowrap' }),
    }}>
      {message}
      {dismissible && (
        <button
          onClick={onDismiss}
          aria-label="Sluiten"
          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: COLORS.textMuted, display: 'flex' }}
        >
          <XIcon size={16} weight="bold" />
        </button>
      )}
    </div>
  );
}
