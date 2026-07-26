import { COLORS } from '../design/tokens.js';
import { t } from '../i18n/index.js';
import { CrossIcon } from '../icons/index.jsx';

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const { message, borderColor = COLORS.accent, textColor = COLORS.text, dismissible = false, wrap = false, plain = false } = toast;

  // Plain Toast (Figma node 533:1998, 2026-07-26): the simple "just tell
  // them what happened" case — solid neutral surface, single line, always
  // auto-dismissing, no close action. Sits above FloatingNavigation rather
  // than floating near the top, matching the actual Material Snackbar
  // convention (only reachable from the main app, where FloatingNavigation
  // exists — Onboarding has no equivalent anchor). Kept as a fully separate
  // render path rather than folded into the props below: the dismissible/
  // wrap/colored-border toasts (errors, the notification-permission
  // message) haven't been redesigned and must keep looking exactly as
  // they do today.
  if (plain) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 28px)', maxWidth: 374, boxSizing: 'border-box',
          background: COLORS.toastBackground, borderRadius: 8, height: 48, padding: '0 16px',
          display: 'flex', alignItems: 'center', zIndex: 200,
        }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: COLORS.textInverse }}>
          {message}
        </span>
      </div>
    );
  }

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
