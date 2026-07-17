import { getLang } from '../i18n/index.js';

import { PackageIcon } from '@phosphor-icons/react/dist/csr/Package';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { TrafficConeIcon } from '@phosphor-icons/react/dist/csr/TrafficCone';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { MaskHappyIcon } from '@phosphor-icons/react/dist/csr/MaskHappy';
import { DropIcon } from '@phosphor-icons/react/dist/csr/Drop';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { BinocularsIcon } from '@phosphor-icons/react/dist/csr/Binoculars';
import { MapPinIcon } from '@phosphor-icons/react/dist/csr/MapPin';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/csr/CalendarPlus';
import { ChatsCircleIcon } from '@phosphor-icons/react/dist/csr/ChatsCircle';
import { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
import { ArmchairIcon } from '@phosphor-icons/react/dist/csr/Armchair';
import { GiftIcon } from '@phosphor-icons/react/dist/csr/Gift';
import { ShieldStarIcon } from '@phosphor-icons/react/dist/csr/ShieldStar';

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
export const CATEGORY_TREE = [
  {
    key: 'bezorging', label: 'Bezorging', sub: 'Pakket aangenomen of pakket gezocht', icon: PackageIcon,
    types: [
      { key: 'pakket_aangenomen', label: 'Pakket aangenomen', sub: 'Pakket ontvangen voor een buur',    icon: PackageIcon },
      { key: 'pakket_gezocht',    label: 'Pakket gezocht',    sub: 'Op zoek naar een vermist pakket',   icon: MagnifyingGlassIcon },
    ],
  },
  {
    key: 'straatzaken', label: 'Straatzaken', sub: 'Container, steiger, kraan of andere tijdelijke hinder', icon: TrafficConeIcon,
    types: null,
  },
  {
    key: 'melding', label: 'Melding', sub: 'Schade, overlast of iets verdachts', icon: WarningIcon,
    types: [
      { key: 'overlast', label: 'Overlast',           sub: 'Meld overlast in de straat',  icon: MaskHappyIcon },
      { key: 'schade',   label: 'Schade',             sub: 'Meld schade in de straat',    icon: DropIcon },
      { key: 'verdacht', label: 'Verdachte situatie', sub: 'Iets gezien dat niet klopt?', icon: EyeIcon },
    ],
  },
  {
    key: 'lostandfound', label: 'Lost & Found', sub: 'Iets verloren of gevonden', icon: BinocularsIcon,
    types: [
      { key: 'verloren', label: 'Verloren', sub: 'Iets kwijtgeraakt', icon: MagnifyingGlassIcon },
      { key: 'gevonden', label: 'Gevonden', sub: 'Iets gevonden',      icon: MapPinIcon },
    ],
  },
  { key: 'evenement', label: 'Evenement', sub: 'Van straatborrel tot....straatborrel?', icon: CalendarPlusIcon, types: null },
  {
    key: 'algemeen', label: 'Algemeen', sub: 'Van oppas gezocht tot gratis af te halen', icon: ChatsCircleIcon,
    types: [
      { key: 'gezocht',     label: 'Gezocht',          sub: 'Op zoek naar iets of iemand',          icon: QuestionIcon },
      { key: 'te_koop',     label: 'Te koop',           sub: 'Bied iets te koop aan',                icon: ArmchairIcon },
      { key: 'gratis',      label: 'Gratis af te halen', sub: 'Geef iets gratis weg',               icon: GiftIcon },
      { key: 'aanbeveling', label: 'Aanbeveling',       sub: 'Tip een bedrijf, restaurant of vakman', icon: ShieldStarIcon },
    ],
  },
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
  if (cat.key === 'straatzaken') for (const ty of STRAATZAKEN_TYPES) labels[ty.key] = ty.label;
  return [cat.key, { ...labels, ...LEGACY_TYPE_LABELS[cat.key] }];
}));

export function typeLabel(cat, type) {
  return TYPE_LABELS[cat]?.[type] || type;
}
