import nl from './nl.js';
import en from './en.js';

const LANGS = { nl, en };

let currentLang = localStorage.getItem('lang') || 'nl';

if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLang;
}

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

export function t(key, vars = {}) {
  const dict = LANGS[currentLang] || LANGS.nl;
  let str = dict[key] ?? LANGS.nl[key] ?? key;
  if (typeof str === 'string') {
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }
  return str;
}
