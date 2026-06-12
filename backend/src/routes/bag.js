import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();
const BAG_BASE = 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2';
const addressCache = new Map();
const CACHE_TTL = 24 * 3600 * 1000;

function normalizeSuffix(huisletter, toevoeging) {
  const raw = (toevoeging || huisletter || '').toUpperCase().trim();
  if (!raw) return null;
  if (['H', 'HUIS', 'BG'].includes(raw)) return 'hs';
  return raw.toLowerCase();
}

async function fetchBagAddresses(streetName, city) {
  const key = process.env.BAG_API_KEY;
  if (!key) return null;

  const cacheKey = `${streetName}::${city}`;
  const cached = addressCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let all = [];
  let url = `${BAG_BASE}/adressen?` + new URLSearchParams({
    openbareRuimteNaam: streetName,
    woonplaatsNaam: city,
    pageSize: '200',
  });

  for (let page = 0; page < 10; page++) {
    const res = await fetch(url, {
      headers: { 'X-Api-Key': key, 'Accept': 'application/hal+json' },
    });
    if (!res.ok) throw new Error(`BAG API error ${res.status}`);
    const data = await res.json();
    all = all.concat(data._embedded?.adressen || []);
    const next = data._links?.next?.href;
    if (!next) break;
    url = next;
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
  const addresses = await fetchBagAddresses(name, city);

  if (!addresses) return res.status(503).json({ error: 'BAG_API_KEY not configured' });
  res.json(addresses);
});

export default router;
