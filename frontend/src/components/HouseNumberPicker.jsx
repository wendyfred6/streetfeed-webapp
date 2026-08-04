import { useState, useEffect, useId } from 'react';

import { COLORS } from '../design/tokens.js';
import { FIELD_INPUT, FIELD_LABEL } from '../design/fieldStyles.js';
import { api } from '../api/client.js';
import { t } from '../i18n/index.js';
import { ChevronDownIcon } from '../icons/index.jsx';

const selectStyle = {
  ...FIELD_INPUT,
  paddingRight: 36,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
};

// FRE-411 (pilot-blocking): a single transient failure here — a PDOK
// hiccup, a 429 from bagLookupLimiter, a cold backend right after a
// redeploy — used to be cached as `[]` forever (module-level Map, no TTL),
// indistinguishable from "this street genuinely has no addresses". Every
// post-creation attempt for the rest of that browser tab's life showed an
// empty picker with zero user-facing error, recoverable only by a full page
// reload (logging out/in, closing the tab, etc.) — never by retrying within
// the app itself. Fixed two ways: retry the request a few times before
// giving up (self-heals the transient case with no user action at all),
// and never cache a failure (so even a sustained outage retries fresh on
// the next mount — reopening the sheet — instead of staying poisoned).
const addressCache = new Map();

async function fetchAddressesWithRetry(streetId, attempts = 3, delayMs = 700) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await api.get(`/bag/addresses/${streetId}`);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

function fetchAddresses(streetId) {
  if (!addressCache.has(streetId)) {
    const promise = fetchAddressesWithRetry(streetId).catch(err => {
      addressCache.delete(streetId);
      throw err;
    });
    addressCache.set(streetId, promise);
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

export default function HouseNumberPicker({ streetId, value, onChange, showSuffix = true, showLabels = false, numberLabel, suffixLabel, style = {} }) {
  const numId = useId();
  const sufId = useId();
  const [num, setNum] = useState('');
  const [suf, setSuf] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchAddresses(streetId)
      .then(data => { if (!cancelled) { setAddresses(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setAddresses([]); setLoading(false); setLoadError(true); } });
    return () => { cancelled = true; };
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
        {showLabels && <label htmlFor={numId} style={FIELD_LABEL}>{numberLabel ?? t('house_number_label')}</label>}
        <div style={{ position: 'relative' }}>
          <select
            id={numId}
            value={num}
            onChange={e => handleNum(e.target.value)}

            disabled={loading}
            style={{ ...selectStyle, opacity: loading ? 0.6 : 1 }}
          >
            <option value="">{loading ? t('house_number_loading') : loadError ? t('house_number_load_error') : t('house_number_choose')}</option>
            {numbers.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDownIcon size={12} color={COLORS.textMuted}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {showSuffix && suffixes.length > 1 && (
        <div style={{ flex: 1, ...(showLabels ? { display: 'flex', flexDirection: 'column', gap: 8 } : { position: 'relative' }) }}>
          {showLabels && <label htmlFor={sufId} style={FIELD_LABEL}>{suffixLabel ?? t('house_suffix_label')}</label>}
          <div style={{ position: 'relative' }}>
            <select
              id={sufId}
              value={suf}
              onChange={e => handleSuf(e.target.value)}

              style={selectStyle}
            >
              <option value="">{t('house_number_choose')}</option>
              {suffixes.map(s => (
                <option key={s} value={s}>{s === 'hs' ? t('house_number_ground_floor') : s}</option>
              ))}
            </select>
            <ChevronDownIcon size={12} color={COLORS.textMuted}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
}
