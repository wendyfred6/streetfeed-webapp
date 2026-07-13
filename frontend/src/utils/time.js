import { t, getLang } from '../i18n/index.js';

export function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return t('time_just_now');
  if (diff < 3600) return t('time_min_ago', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time_hour_ago', { n: Math.floor(diff / 3600) });
  if (diff < 172800) return t('time_yesterday');
  return new Date(ts).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' });
}
