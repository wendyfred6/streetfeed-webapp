import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();
const PDOK_BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const addressCache = new Map();
const CACHE_TTL = 24 * 3600 * 1000;

function normalizeSuffix(huisletter, toevoeging) {
  const raw = (toevoeging || huisletter || '').toUpperCase().trim();
  if (!raw) return null;
  if (['H', 'HUIS', 'BG'].includes(raw)) return 'hs';
  return raw.toLowerCase();
}

async function fetchAddresses(streetName, city) {
  const cacheKey = `${streetName}::${city}`;
  const cached = addressCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let all = [];
  let start = 0;
  const rows = 100;

  while (true) {
    const params = new URLSearchParams({
      q: `${streetName} ${city}`,
      fq: 'type:adres',
      rows: String(rows),
      start: String(start),
      fl: 'huisnummer,huisletter,huisnummertoevoeging',
    });

    const res = await fetch(`${PDOK_BASE}?${params}`);
    if (!res.ok) throw new Error(`PDOK error ${res.status}`);
    const data = await res.json();
    const docs = data.response?.docs || [];
    all = all.concat(docs);

    if (all.length >= data.response?.numFound || docs.length < rows) break;
    start += rows;
    if (start > 500) break; // safety limit
  }

  const addresses = all
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

  addressCache.set(cacheKey, { ts: Date.now(), data: addresses });
  return addresses;
}

// GET /api/bag/addresses/:streetId
router.get('/addresses/:streetId', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT name, city FROM streets WHERE id = $1',
    [req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Street not found' });

  const { name, city } = rows[0];
  const addresses = await fetchAddresses(name, city);
  res.json(addresses);
});

export default router;
