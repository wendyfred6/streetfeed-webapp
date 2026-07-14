import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';

export default function SegmentedControl({ options, value, onChange, label, style }) {
  const selectedIndex = Math.max(0, options.findIndex(o => o.key === value));
  const scrollRef = useRef(null);
  const [pillGeom, setPillGeom] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tab = el.querySelector(`[data-tab="${selectedIndex}"]`);
    if (!tab) return;
    setPillGeom({ left: tab.offsetLeft, width: tab.offsetWidth });
  }, [selectedIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tab = el.querySelector(`[data-tab="${selectedIndex}"]`);
    if (!tab) return;
    const center = tab.offsetLeft - (el.offsetWidth - tab.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
  }, [value]);

  return (
    <div style={style}>
      {label && <div style={s.sectionLabel}>{label}</div>}
      <div style={{ padding: '0 19px 12px' }}>
        <div ref={scrollRef} style={{
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          background: 'rgba(255,255,255,0.32)',
          borderRadius: RADIUS.pill,
          padding: 8,
        }}>
          {/* witte pill — positie en breedte gemeten uit DOM */}
          <div style={{
            position: 'absolute',
            top: 8, left: pillGeom.left,
            height: 'calc(100% - 16px)', width: pillGeom.width,
            background: '#FFFFFF',
            borderRadius: RADIUS.pill,
            boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
            transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'none',
          }} />
          {options.map(({ key, label: optLabel }, idx) => (
            <div
              key={key}
              data-tab={idx}
              onClick={() => onChange(key)}
              style={{
                flexShrink: 0,
                height: 32,
                display: 'flex', alignItems: 'center',
                padding: '0 12px',
                fontSize: 13,
                fontWeight: value === key ? 700 : 500,
                color: value === key ? COLORS.accent : COLORS.textMuted,
                cursor: 'pointer', userSelect: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                position: 'relative', zIndex: 1,
              }}
            >
              {optLabel}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
