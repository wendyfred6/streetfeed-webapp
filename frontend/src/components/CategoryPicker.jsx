import { useState } from 'react';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { CATEGORY_TREE } from '../utils/categories.js';
import { ArrowCircleLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowCircleLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';

// Centered modal, all navigation levels handled internally (path = drill-down
// history through CATEGORY_TREE). See the CenteredModal item in M6 for
// sharing this overlay chrome with NewPostSheet's — out of scope here.
export default function CategoryPicker({ onClose, onSelect }) {
  const [path, setPath] = useState([]);
  const [closing, setClosing] = useState(false);

  const close = () => { setClosing(true); setTimeout(onClose, 220); };

  const currentItems = path.reduce(
    (items, { key }) => items.find(it => it.key === key)?.types || [],
    CATEGORY_TREE,
  );

  const handleRow = (item) => {
    if (item.types) {
      setPath(prev => [...prev, { key: item.key, label: item.label }]);
    } else {
      const cat  = path.length === 0 ? item.key : path[0].key;
      const type = path.length === 0 ? null     : item.key;
      setClosing(true);
      setTimeout(() => onSelect(cat, type), 220);
    }
  };

  const goBack = () => setPath(prev => prev.slice(0, -1));

  const isMain     = path.length === 0;
  const heading    = isMain ? 'Wat wil je delen?' : path[path.length - 1].label;
  const breadcrumb = path.length > 1 ? path[path.length - 2].label : null;

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: RADIUS.lg,
    padding: '14px 16px',
    cursor: 'pointer',
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
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: RADIUS.xl,
          padding: '28px 20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: `${closing ? 'modalOut 0.22s ease-in' : 'modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1)'} forwards`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {isMain ? (
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>
            Wat wil je delen?
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={goBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label="Terug">
                <ArrowCircleLeftIcon size={40} weight="regular" color={COLORS.text} />
              </button>
              <div>
                {breadcrumb && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
                    {breadcrumb}
                  </div>
                )}
                <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{heading}</div>
              </div>
            </div>
          </div>
        )}

        {/* Rijen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
          {currentItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.key} onClick={() => handleRow(item)} className="tap-feedback" style={rowStyle}>
                <Icon size={28} weight="regular" color={COLORS.text} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>}
                </div>
                {item.types && <CaretRightIcon size={16} weight="bold" color={COLORS.textDim} />}
              </div>
            );
          })}
        </div>

        {/* Knoppen */}
        <button onClick={close} style={{ ...s.cancelBtn, marginTop: 16 }}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
