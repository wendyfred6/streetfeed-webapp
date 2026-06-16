import { useState, useEffect } from 'react';

import { COLORS } from '../design/tokens.js';
import { api } from '../api/client.js';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';

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

// Cache per streetId zodat meerdere pickers op één formulier (Van/Tot) niet
// allebei een eigen BAG-call doen
const addressCache = new Map();

function fetchAddresses(streetId) {
  if (!addressCache.has(streetId)) {
    addressCache.set(streetId, api.get(`/bag/addresses/${streetId}`).catch(() => []));
  }
  return addressCache.get(streetId);
}

function groupAddresses(flat) {
  const map = {};
  for (const addr of flat || []) {
    const dash = addr.indexOf('-');
    const num = dash === -1 ? addr : addr.slice(0, dash);
    const suf = dash === -1 ? '' : addr.slice(dash + 1);
    if (!map[num]) map[num] = [];
    if (suf) map[num].push(suf);
  }
  return map;
}

export default function HouseNumberPicker({ streetId, value, onChange, style = {} }) {
  const [num, setNum] = useState('');
  const [suf, setSuf] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAddresses(streetId).then(data => { setAddresses(data); setLoading(false); });
  }, [streetId]);

  useEffect(() => {
    if (!value) { setNum(''); setSuf(''); return; }
    const dash = value.indexOf('-');
    setNum(dash === -1 ? value : value.slice(0, dash));
    setSuf(dash === -1 ? '' : value.slice(dash + 1));
  }, [value]);

  const grouped = groupAddresses(addresses);
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
          disabled={loading}
          style={{ ...inputStyle, paddingRight: 32, marginBottom: 0, opacity: loading ? 0.6 : 1 }}
        >
          <option value="">{loading ? 'Laden…' : 'Huisnr.'}</option>
          {numbers.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <CaretDownIcon size={12} color={COLORS.textMuted} weight="regular"
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>

      {suffixes.length > 1 && (
        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={suf}
            onChange={e => handleSuf(e.target.value)}
            style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
          >
            <option value="">Toevoeging</option>
            {suffixes.map(s => (
              <option key={s} value={s}>{s === 'hs' ? 'hs (begane grond)' : s}</option>
            ))}
          </select>
          <CaretDownIcon size={12} color={COLORS.textMuted} weight="regular"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      )}
    </div>
  );
}
