import { COLORS, RADIUS } from '../design/tokens.js';
import { t } from '../i18n/index.js';

export default function ActionMenu({ items, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '0 12px 20px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 8 }}>
          {items.map((item, i) => (
            <div key={i}>
              {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 16px' }} />}
              <button type="button" onClick={item.action} style={{ display: 'block', width: '100%', background: 'none', border: 'none', fontFamily: 'inherit', padding: '14px 16px', textAlign: 'center', fontSize: 16, color: item.destructive ? COLORS.error : COLORS.text, fontWeight: 400, cursor: 'pointer' }}>
                {item.label}
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: RADIUS.xl, padding: '14px', fontSize: 16, fontWeight: 700, color: COLORS.accent, border: 'none', cursor: 'pointer' }}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
