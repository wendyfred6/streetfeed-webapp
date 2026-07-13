import { Router } from 'express';
import { query } from '../db/index.js';
import { bagLookupLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(bagLookupLimiter);
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
    });

    const url = `${PDOK_BASE}?${params}`;
    console.log('[bag] PDOK fetch:', url);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error('[bag] PDOK error', res.status, text);
      throw new Error(`PDOK error ${res.status}`);
    }
    const data = await res.json();
    const docs = data.response?.docs || [];
    console.log(`[bag] PDOK page start=${start} got ${docs.length}/${data.response?.numFound}`);
    all = all.concat(docs);

    if (all.length >= (data.response?.numFound || 0) || docs.length < rows) break;
    start += rows;
    if (start > 500) break;
  }

  // PDOK's vrije-tekst-zoekopdracht is relevance-based en geeft soms ook
  // resultaten van andere straten/plaatsen terug — alleen exacte match gebruiken
  const addresses = all
    .filter(a =>
      (a.straatnaam || '').toLowerCase() === streetName.toLowerCase() &&
      (a.woonplaatsnaam || '').toLowerCase() === city.toLowerCase()
    )
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

// GET /api/bag/validate — adres valideren voor onboarding (geen auth vereist)
router.get('/validate', async (req, res) => {
  const { postcode, huisnummer, toevoeging } = req.query;

  if (!postcode || !huisnummer) {
    return res.status(400).json({ error: 'postcode en huisnummer zijn verplicht' });
  }

  const pc = postcode.replace(/\s/g, '').toUpperCase();
  const hn = parseInt(huisnummer, 10);

  if (!/^\d{4}[A-Z]{2}$/.test(pc) || isNaN(hn)) {
    return res.status(400).json({ error: 'Ongeldige postcode of huisnummer' });
  }

  try {
    const params = new URLSearchParams({ q: `${pc} ${hn}`, fq: 'type:adres', rows: '25', start: '0' });
    const resp = await fetch(`${PDOK_BASE}?${params}`);
    if (!resp.ok) throw new Error(`PDOK ${resp.status}`);
    const data = await resp.json();
    const docs = data.response?.docs || [];

    const match = docs.find(d => {
      if (d.huisnummer !== hn) return false;
      if (toevoeging) {
        const suf = normalizeSuffix(d.huisletter, d.huisnummertoevoeging);
        return suf === normalizeSuffix(null, toevoeging);
      }
      return true;
    });

    if (!match) return res.status(404).json({ error: 'Adres niet gevonden' });

    const { straatnaam, woonplaatsnaam, huisnummertoevoeging, huisletter } = match;

    const { rows } = await query(
      'SELECT id, name, city FROM streets WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)',
      [straatnaam, woonplaatsnaam]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Deze straat is nog niet beschikbaar in Streetfeed',
        streetName: straatnaam,
        city: woonplaatsnaam,
      });
    }

    const suf = normalizeSuffix(huisletter, huisnummertoevoeging);
    res.json({
      streetId: rows[0].id,
      streetName: rows[0].name,
      city: rows[0].city,
      houseNumber: suf ? `${hn}-${suf}` : String(hn),
    });
  } catch (err) {
    console.error('[bag] validate error:', err.message);
    res.status(502).json({ error: 'BAG service tijdelijk niet beschikbaar' });
  }
});

// GET /api/bag/resolve-street?postcode=XXXX — straat herleiden uit
// alleen de postcode (geen auth vereist, voor onboarding stap 1).
// Een Nederlandse postcode is granulair genoeg om altijd naar dezelfde
// straat/plaats te wijzen, dus het eerste resultaat is betrouwbaar.
router.get('/resolve-street', async (req, res) => {
  const { postcode } = req.query;
  if (!postcode) return res.status(400).json({ error: 'Postcode is verplicht' });

  const pc = postcode.replace(/\s/g, '').toUpperCase();
  if (!/^\d{4}[A-Z]{2}$/.test(pc)) {
    return res.status(400).json({ error: 'Ongeldige postcode' });
  }

  try {
    const params = new URLSearchParams({ q: pc, fq: 'type:adres', rows: '5', start: '0' });
    const resp = await fetch(`${PDOK_BASE}?${params}`);
    if (!resp.ok) throw new Error(`PDOK ${resp.status}`);
    const data = await resp.json();
    const docs = data.response?.docs || [];
    if (!docs.length) return res.status(404).json({ error: 'Postcode niet gevonden' });

    const { straatnaam, woonplaatsnaam } = docs[0];
    const { rows } = await query(
      'SELECT id, name, city FROM streets WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)',
      [straatnaam, woonplaatsnaam]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Deze straat is nog niet beschikbaar in Streetfeed',
        streetName: straatnaam,
        city: woonplaatsnaam,
      });
    }

    res.json({ streetId: rows[0].id, streetName: rows[0].name, city: rows[0].city });
  } catch (err) {
    console.error('[bag] resolve-street error:', err.message);
    res.status(502).json({ error: 'BAG service tijdelijk niet beschikbaar' });
  }
});

// GET /api/bag/addresses/:streetId — geen auth: ook nodig tijdens
// onboarding (stap 2, huisnummer kiezen), vóórdat je bent ingelogd.
router.get('/addresses/:streetId', async (req, res) => {
  const { rows } = await query(
    'SELECT name, city FROM streets WHERE id = $1',
    [req.params.streetId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Street not found' });

  const { name, city } = rows[0];
  try {
    const addresses = await fetchAddresses(name, city);
    res.json(addresses);
  } catch (err) {
    console.error('[bag] fetchAddresses failed:', err.message);
    res.status(502).json({ error: err.message });
  }
});

export default router;
