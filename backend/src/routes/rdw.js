import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/rdw/:kenteken — proxy to RDW open data
router.get('/:kenteken', requireAuth, async (req, res) => {
  const clean = req.params.kenteken.replace(/-/g, '').toUpperCase();
  if (clean.length < 4) return res.status(400).json({ error: 'Kenteken too short' });

  const response = await fetch(
    `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${clean}`
  );
  const data = await response.json();

  if (!data.length) return res.status(404).json({ error: 'Kenteken niet gevonden in RDW' });

  const v = data[0];
  res.json({
    merk: v.merk || '–',
    type: v.handelsbenaming || v.type_remsysteem_voertuig || '–',
    kleur: v.eerste_kleur || '–',
    bouwjaar: v.datum_eerste_toelating ? v.datum_eerste_toelating.slice(0, 4) : '–',
    brandstof: v.brandstof_omschrijving || '–',
  });
});

export default router;
