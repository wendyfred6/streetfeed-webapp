import { useState, useEffect } from 'react';

const COLORS = {
  bg: '#0F0F0F', border: '#2A2A2A', text: '#F0F0F0',
  textMuted: '#888888',
};

const inputStyle = {
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: COLORS.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
};

// Reyer Anslostraat: oneven 1–29 (1054 KT) en even 2–30 (1054 KV)
// Toevoegingen H/1/2/3/4 per nummer
function buildStreetAddresses() {
  const result = [];
  const suffixes = ['hs', '1', '2', '3', '4'];
  for (let n = 1; n <= 29; n += 2) {
    for (const s of suffixes) result.push(`${n}-${s}`);
  }
  for (let n = 2; n <= 30; n += 2) {
    for (const s of suffixes) result.push(`${n}-${s}`);
  }
  return result;
}

const STREET_ADDRESSES = buildStreetAddresses();

function groupAddresses(flat) {
  const map = {};
  for (const addr of flat) {
    const dash = addr.indexOf('-');
    const num = dash === -1 ? addr : addr.slice(0, dash);
    const suf = dash === -1 ? '' : addr.slice(dash + 1);
    if (!map[num]) map[num] = [];
    if (suf) map[num].push(suf);
  }
  return map;
}

export default function HouseNumberPicker({ value, onChange, style = {} }) {
  const [num, setNum] = useState('');
  const [suf, setSuf] = useState('');

  useEffect(() => {
    if (!value) { setNum(''); setSuf(''); return; }
    const dash = value.indexOf('-');
    setNum(dash === -1 ? value : value.slice(0, dash));
    setSuf(dash === -1 ? '' : value.slice(dash + 1));
  }, [value]);

  const grouped = groupAddresses(STREET_ADDRESSES);
  const numbers = Object.keys(grouped).sort((a, b) => +a - +b);
  const suffixes = num ? (grouped[num] || []) : [];

  const emit = (n, s) => onChange(s ? `${n}-${s}` : n);

  const handleNum = (n) => {
    setNum(n);
    setSuf('');
    if (!n) { onChange(''); return; }
    const subs = grouped[n] || [];
    if (subs.length <= 1) emit(n, subs[0] || '');
    else onChange('');
  };

  const handleSuf = (s) => {
    setSuf(s);
    if (s) emit(num, s);
  };

  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <select
          value={num}
          onChange={e => handleNum(e.target.value)}
          style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
        >
          <option value="">Huisnr.</option>
          {numbers.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {suffixes.length > 1 && (
        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={suf}
            onChange={e => handleSuf(e.target.value)}
            style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
          >
            <option value="">Etage</option>
            {suffixes.map(s => (
              <option key={s} value={s}>{s === 'hs' ? 'hs (begane grond)' : s}</option>
            ))}
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      )}
    </div>
  );
}
