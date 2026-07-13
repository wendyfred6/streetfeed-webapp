import { useState, useEffect, useId } from 'react';

import { COLORS } from '../design/tokens.js';
import { FIELD_INPUT, FIELD_LABEL } from '../design/onboardingStyles.js';
import { api } from '../api/client.js';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';

const selectStyle = {
  ...FIELD_INPUT,
  paddingRight: 36,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
};

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

export default function HouseNumberPicker({ streetId, value, onChange, showSuffix = true, showLabels = false, style = {} }) {
  const numId = useId();
  const sufId = useId();
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
    if (!showSuffix) { onChange(n); return; }
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
      <div style={{ flex: 1, ...(showLabels ? { display: 'flex', flexDirection: 'column', gap: 8 } : { position: 'relative' }) }}>
        {showLabels && <label htmlFor={numId} style={FIELD_LABEL}>Huisnummer</label>}
        <div style={{ position: 'relative' }}>
          <select
            id={numId}
            value={num}
            onChange={e => handleNum(e.target.value)}

            disabled={loading}
            style={{ ...selectStyle, opacity: loading ? 0.6 : 1 }}
          >
            <option value="">{loading ? 'Laden…' : 'Kies'}</option>
            {numbers.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <CaretDownIcon size={12} color={COLORS.textMuted} weight="regular"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {showSuffix && suffixes.length > 1 && (
        <div style={{ flex: 1, ...(showLabels ? { display: 'flex', flexDirection: 'column', gap: 8 } : { position: 'relative' }) }}>
          {showLabels && <label htmlFor={sufId} style={FIELD_LABEL}>Toevoeging</label>}
          <div style={{ position: 'relative' }}>
            <select
              id={sufId}
              value={suf}
              onChange={e => handleSuf(e.target.value)}

              style={selectStyle}
            >
              <option value="">Kies</option>
              {suffixes.map(s => (
                <option key={s} value={s}>{s === 'hs' ? 'hs (begane grond)' : s}</option>
              ))}
            </select>
            <CaretDownIcon size={12} color={COLORS.textMuted} weight="regular"
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
}
