import { useState, useEffect } from 'react';

const COLORS = {
  bg: '#0F0F0F', border: '#2A2A2A', text: '#F0F0F0',
  textMuted: '#888888', accent: '#E8FF47',
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

const PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';

function normalizeSuffix(huisletter, toevoeging) {
  const raw = (toevoeging || huisletter || '').toUpperCase().trim();
  if (!raw) return null;
  if (['H', 'HUIS', 'BG'].includes(raw)) return 'hs';
  return raw.toLowerCase();
}

async function loadAddresses(streetName, city) {
  let all = [];
  let start = 0;
  const rows = 100;

  while (true) {
    const params = new URLSearchParams({
      q: `${streetName} ${city}`,
      fq: 'type:adres',
      rows: String(rows),
      start: String(start),
    });
    const res = await fetch(`${PDOK}?${params}`);
    if (!res.ok) throw new Error(`PDOK ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    all = all.concat(docs);
    if (all.length >= (data.response?.numFound || 0) || docs.length < rows) break;
    start += rows;
    if (start > 500) break;
  }

  return all
    .map(a => {
      const suf = normalizeSuffix(a.huisletter, a.huisnummertoevoeging);
      return suf ? `${a.huisnummer}-${suf}` : String(a.huisnummer);
    })
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => {
      const [na, sa = ''] = a.split('-');
      const [nb, sb = ''] = b.split('-');
      if (+na !== +nb) return +na - +nb;
      if (sa === 'hs' && sb !== 'hs') return -1;
      if (sb === 'hs' && sa !== 'hs') return 1;
      return sa.localeCompare(sb, undefined, { numeric: true });
    });
}

// Groups ["28-hs","28-1","28-2","30-hs","30-1"] into { "28": ["hs","1","2"], "30": ["hs","1"] }
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

export default function HouseNumberPicker({ value, onChange, streetName = 'Reyer Anslostraat', city = 'Amsterdam', style = {} }) {
  const [addresses, setAddresses] = useState(null); // null = loading, [] = failed/empty
  const [num, setNum] = useState('');
  const [suf, setSuf] = useState('');

  useEffect(() => {
    loadAddresses(streetName, city)
      .then(data => setAddresses(data))
      .catch(() => setAddresses([]));
  }, [streetName, city]);

  // Sync picker back from external value (e.g. when editing existing profile)
  useEffect(() => {
    if (!value) { setNum(''); setSuf(''); return; }
    const dash = value.indexOf('-');
    setNum(dash === -1 ? value : value.slice(0, dash));
    setSuf(dash === -1 ? '' : value.slice(dash + 1));
  }, [value]);

  const emit = (n, s) => onChange(s ? `${n}-${s}` : n);

  const handleNum = (n) => {
    setNum(n);
    setSuf('');
    if (!n) { onChange(''); return; }
    const grouped = groupAddresses(addresses || []);
    const subs = grouped[n] || [];
    if (subs.length <= 1) emit(n, subs[0] || '');
    else onChange(''); // wait for suffix selection
  };

  const handleSuf = (s) => {
    setSuf(s);
    if (s) emit(num, s);
  };

  // Fallback: text input if PDOK failed or returned nothing
  if (addresses !== null && addresses.length === 0) {
    return (
      <input
        style={{ ...inputStyle, ...style, cursor: 'text' }}
        type="text"
        placeholder="bijv. 28-hs of 28-1"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  const grouped = addresses ? groupAddresses(addresses) : {};
  const numbers = Object.keys(grouped).sort((a, b) => +a - +b);
  const suffixes = num ? (grouped[num] || []) : [];

  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <select
          value={num}
          onChange={e => handleNum(e.target.value)}
          disabled={addresses === null}
          style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
        >
          <option value="">{addresses === null ? 'Laden…' : 'Huisnr.'}</option>
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
