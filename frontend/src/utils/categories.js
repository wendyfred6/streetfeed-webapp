import { getLang } from '../i18n/index.js';

import { PackageIcon } from '@phosphor-icons/react/dist/csr/Package';
import { TrafficConeIcon } from '@phosphor-icons/react/dist/csr/TrafficCone';
import { BinocularsIcon } from '@phosphor-icons/react/dist/csr/Binoculars';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/csr/CalendarPlus';
import { ChatsCircleIcon } from '@phosphor-icons/react/dist/csr/ChatsCircle';

export const CATEGORIES = {
  bezorging:    { label: 'Bezorging',    labelEn: 'Package',       color: '#4488FF' },
  straatzaken:  { label: 'Straatzaken',  labelEn: 'Street',        color: '#FF8833', pinnable: true },
  melding:      { label: 'Melding',      labelEn: 'Report',        color: '#FF4444' },
  lostandfound: { label: 'Lost & Found', labelEn: 'Lost & Found',  color: '#9966CC' },
  evenement:    { label: 'Evenement',    labelEn: 'Event',         color: '#AA77FF', pinnable: true, isEvent: true },
  algemeen:     { label: 'Algemeen',     labelEn: 'General',       color: '#44BB44' },
};

// Backward compat labels for posts stored before the category rename
export const LEGACY_LABELS = {
  package:   { nl: 'Bezorging',   en: 'Package'     },
  works:     { nl: 'Straatzaken', en: 'Street'      },
  incident:  { nl: 'Melding',     en: 'Report'      },
  event:     { nl: 'Evenement',   en: 'Event'       },
  general:   { nl: 'Algemeen',    en: 'General'     },
  blockage:  { nl: 'Blokkade',    en: 'Blockage'    },
  container: { nl: 'Container',   en: 'Container'   },
  waste:     { nl: 'Grofvuil',    en: 'Bulk waste'  },
};

export function catLabel(key) {
  const c = CATEGORIES[key];
  if (!c) return LEGACY_LABELS[key]?.[getLang() === 'en' ? 'en' : 'nl'] || key;
  return getLang() === 'en' ? c.labelEn : c.label;
}

// ─── SUB-TYPE TREE ──────────────────────────────────────────────────────────
// Single source of truth for New Post Sheet sub-types: drives the
// CategoryPicker's navigable tree (icon + sub description + hierarchy)
// AND the type-label lookup used by the feed and NewPostSheet heading.
// Previously this drifted across three separate maps (PICKER_DATA,
// TYPE_META, and inline per-category maps recreated inside PostCard on
// every render) — see FRE-311.
// Melding is intentionally absent here — not part of Pilot v1 (Category
// Picker List alignment, 2026-07-18). Its category/flags/rendering logic
// elsewhere is untouched (existing Melding posts still render correctly),
// it's just no longer a selectable option in this picker.
export const CATEGORY_TREE = [
  {
    key: 'bezorging', label: 'Bezorging', sub: 'Pakketten ontvangen of hulp gevraagd bij bezorging', icon: PackageIcon,
    types: null,
  },
  {
    key: 'straatzaken', label: 'Straatzaken', sub: 'Tijdelijke zaken rondom de straat', icon: TrafficConeIcon,
    types: null,
  },
  {
    key: 'lostandfound', label: 'Lost & Found', sub: 'Iets verloren of gevonden', icon: BinocularsIcon,
    types: null,
  },
  { key: 'evenement', label: 'Evenement', sub: 'Van straatborrel tot buurtactiviteit', icon: CalendarPlusIcon, types: null },
  {
    key: 'algemeen', label: 'Algemeen', sub: 'Algemene berichten voor de straat', icon: ChatsCircleIcon,
    types: null,
  },
];

// Bezorging's "Situatie" options — chosen inside the post itself (Product
// Model Alignment v1, 2026-07-18), not via CategoryPicker drill-down. Same
// keys/labels the old tree used for these, so existing posts' sub_type
// values need no migration.
export const BEZORGING_TYPES = [
  { key: 'pakket_aangenomen', label: 'Pakket aangenomen' },
  { key: 'pakket_gezocht',    label: 'Pakket gezocht' },
];

// Straatzaken's "Situatie" (Type hinder) options — chosen inside the post
// itself (FRE-367), not via CategoryPicker drill-down. Reuses the same
// container/steiger/kraan keys the old tree used for those, so existing
// posts keep the same sub_type values; verhuislift/parkeerplek_gereserveerd/
// anders are new.
export const STRAATZAKEN_TYPES = [
  { key: 'container',                label: 'Container' },
  { key: 'steiger',                  label: 'Steiger' },
  { key: 'kraan',                    label: 'Kraan' },
  { key: 'verhuislift',              label: 'Verhuislift' },
  { key: 'parkeerplek_gereserveerd', label: 'Parkeerplek gereserveerd' },
  { key: 'anders',                   label: 'Anders' },
];

// Lost & Found's "Situatie" (Type) options — same in-post pattern as
// Straatzaken (FRE-368); keeps the same 'verloren'/'gevonden' keys the old
// tree used, so no legacy-label fallback is needed.
export const LOSTANDFOUND_TYPES = [
  { key: 'verloren', label: 'Verloren' },
  { key: 'gevonden', label: 'Gevonden' },
];

// Sub-type labels that predate the CategoryPicker's current tree (renamed
// or consolidated away) but that older posts may still carry as sub_type
// — kept only so those posts render a real label instead of a raw key.
// This is where FRE-311's drift (`te_leen`/`vraag` etc.) lived.
// straatzaken's `verhuizing`/`parkeerplaatsen` are FRE-367's own drift: both
// were tree entries before the Category Tree flattened to Situatie options.
const LEGACY_TYPE_LABELS = {
  bezorging:   { bezorgd: 'Bezorgd', gezocht: 'Gezocht' },
  straatzaken: { werkzaamheden: 'Werkzaamheden', parkeerverbod: 'Parkeerverbod', verhuizing: 'Verhuizing', parkeerplaatsen: 'Parkeerplek gereserveerd' },
  melding:     { lost_found: 'Lost & Found' },
  algemeen:    { te_leen: 'Te leen', vraag: 'Vraag' },
};

function collectTreeLabels(items, acc) {
  for (const item of items) {
    acc[item.key] = item.label;
    if (item.types) collectTreeLabels(item.types, acc);
  }
}

const TYPE_LABELS = Object.fromEntries(CATEGORY_TREE.map(cat => {
  const labels = {};
  if (cat.types) collectTreeLabels(cat.types, labels);
  if (cat.key === 'bezorging') for (const ty of BEZORGING_TYPES) labels[ty.key] = ty.label;
  if (cat.key === 'straatzaken') for (const ty of STRAATZAKEN_TYPES) labels[ty.key] = ty.label;
  if (cat.key === 'lostandfound') for (const ty of LOSTANDFOUND_TYPES) labels[ty.key] = ty.label;
  return [cat.key, { ...labels, ...LEGACY_TYPE_LABELS[cat.key] }];
}));

export function typeLabel(cat, type) {
  return TYPE_LABELS[cat]?.[type] || type;
}
