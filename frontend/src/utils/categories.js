import { getLang } from '../i18n/index.js';

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
