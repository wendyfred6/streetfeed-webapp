import { COLORS } from '../design/tokens.js';
import { t } from '../i18n/index.js';
import { CrossIcon } from '../icons/index.jsx';

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const { message, borderColor = COLORS.accent, textColor = COLORS.text, dismissible = false, wrap = false } = toast;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
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
          aria-label={t('close')}
          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: COLORS.textMuted, display: 'flex' }}
        >
          <CrossIcon size={16} />
        </button>
      )}
    </div>
  );
}
