import { useState } from 'react';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { CATEGORY_TREE, catLabel, catSub } from '../utils/categories.js';
import { ChevronRightIcon } from '../icons/index.jsx';
import { t } from '../i18n/index.js';

// Centered modal listing the top-level categories. CATEGORY_TREE is flat
// (every entry has types: null — Situaties are chosen in-post per
// FRE-367/368), so there is no drill-down here anymore; each row selects
// its category directly. Matches Figma "Category Picker v0.1" (node
// 239:11566).
export default function CategoryPicker({ onClose, onSelect }) {
  const [closing, setClosing] = useState(false);

  const close = () => { setClosing(true); setTimeout(onClose, 220); };

  const handleRow = (item) => {
    setClosing(true);
    setTimeout(() => onSelect(item.key, null), 220);
  };

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', textAlign: 'left',
    background: COLORS.background,
    borderRadius: 12,
    padding: '14px 16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,10,18,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: `${closing ? 'overlayOut 0.22s ease-in' : 'overlayIn 0.18s ease-out'} forwards`,
      }}
      onClick={close}
    >
      <div
        style={{
          width: '100%', maxWidth: 350,
          background: COLORS.surfaceModal,
          borderRadius: RADIUS.xl,
          padding: '28px 20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: `${closing ? 'modalOut 0.22s ease-in' : 'modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1)'} forwards`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>
          {t('category_picker_heading')}
        </div>

        {/* Rijen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
          {CATEGORY_TREE.map(item => {
            const Icon = item.icon;
            const sub = catSub(item.key);
            return (
              <button key={item.key} type="button" onClick={() => handleRow(item)} className="tap-feedback" style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <Icon size={32} weight="regular" color={COLORS.text} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>{catLabel(item.key)}</div>
                    {sub && <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
                  </div>
                </div>
                <ChevronRightIcon size={16} color={COLORS.textDim} />
              </button>
            );
          })}
        </div>

        {/* Knop */}
        <button onClick={close} style={{ ...s.cancelBtn, marginTop: 16 }}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
