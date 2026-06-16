import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useAuth } from './hooks/useAuth.jsx';
import { usePush, notifSupported } from './hooks/usePush.jsx';
import { api } from './api/client.js';
import { t, getLang, setLang } from './i18n/index.js';

import { COLORS, RADIUS, ALPHA, GLASS } from './design/tokens.js';
import HouseNumberPicker from './components/HouseNumberPicker.jsx';

const CATEGORIES = {
  bezorging:   { label: 'Bezorging',   labelEn: 'Package',   color: '#4488FF' },
  straatzaken: { label: 'Straatzaken', labelEn: 'Street',    color: '#FF8833', pinnable: true },
  melding:     { label: 'Melding',     labelEn: 'Report',    color: '#FF4444' },
  evenement:   { label: 'Evenement',   labelEn: 'Event',     color: '#AA77FF', pinnable: true, isEvent: true },
};

// Backward compat labels for posts stored before the category rename
const LEGACY_LABELS = {
  package:   { nl: 'Bezorging',   en: 'Package'     },
  works:     { nl: 'Straatzaken', en: 'Street'      },
  incident:  { nl: 'Melding',     en: 'Report'      },
  event:     { nl: 'Evenement',   en: 'Event'       },
  general:   { nl: 'Algemeen',    en: 'General'     },
  blockage:  { nl: 'Blokkade',    en: 'Blockage'    },
  container: { nl: 'Container',   en: 'Container'   },
  waste:     { nl: 'Grofvuil',    en: 'Bulk waste'  },
};

function catLabel(key) {
  const c = CATEGORIES[key];
  if (!c) return LEGACY_LABELS[key]?.[getLang() === 'en' ? 'en' : 'nl'] || key;
  return getLang() === 'en' ? c.labelEn : c.label;
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const s = {
  app: { fontFamily: "'Inter','Helvetica Neue',sans-serif", background: 'transparent', color: COLORS.text, minHeight: '100vh', maxWidth: 390, margin: '0 auto' },
  header: { ...GLASS.header, borderBottom: '1px solid rgba(255,255,255,0.3)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 },
  logo: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' },
  accent: { color: COLORS.accent },
  streetBadge: { fontSize: 11, color: COLORS.textMuted, ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm, padding: '3px 8px' },
  feed: { padding: '0 0 100px 0' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textMuted, padding: '16px 20px 8px' },
  card: (pinned) => ({ margin: '0 12px 8px', ...GLASS.card, background: pinned ? COLORS.pinned : 'rgba(255,255,255,0.70)', border: `1px solid ${pinned ? COLORS.pinnedBorder : 'rgba(255,255,255,0.50)'}`, borderRadius: RADIUS.lg, padding: '12px 14px' }),
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 },
  cardBody: { fontSize: 15, color: COLORS.textDim, lineHeight: 1.5 },
  cardMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardMetaLeft: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.textMuted },
  pinnedBadge: { background: COLORS.accent, color: '#FFFFFF', fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: RADIUS.xs },
  endDateBadge: { fontSize: 10, color: COLORS.accent, background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.xs, padding: '2px 6px' },
  filterBar: { display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' },
  filterChip: (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, background: active ? COLORS.accent : 'rgba(255,255,255,0.55)', color: active ? '#FFFFFF' : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '5px 12px', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  fab: { position: 'fixed', bottom: 72, left: 12, right: 12, maxWidth: 456, margin: '0 auto', borderRadius: RADIUS.pill, background: COLORS.accent, color: '#FFFFFF', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', padding: '13px 0', textAlign: 'center', boxShadow: `0 4px 20px ${ALPHA.terraGlow}`, zIndex: 40 },
  tabBar: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, ...GLASS.header, borderTop: '1px solid rgba(255,255,255,0.40)', display: 'flex', zIndex: 50 },
  tab: (active) => ({ flex: 1, padding: '12px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 400, color: active ? COLORS.accent : COLORS.textMuted }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,10,18,0.50)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { ...GLASS.sheet, borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' },
  sheetHandle: { width: 36, height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 2, margin: '0 auto 20px' },
  sheetTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.3px' },
  input: { width: '100%', ...GLASS.input, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 10 },
  textarea: { width: '100%', ...GLASS.input, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', resize: 'none', height: 80, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.accent, display: 'block', marginBottom: 6 },
  catGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  catOption: (selected, cat) => ({ background: selected ? `${CATEGORIES[cat]?.color}18` : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${selected ? CATEGORIES[cat]?.color : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400, whiteSpace: 'nowrap' }),
  submitBtn: { width: '100%', background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  cancelBtn: { width: '100%', background: 'rgba(255,255,255,0.60)', color: COLORS.accent, border: `2px solid ${COLORS.accent}`, borderRadius: RADIUS.pill, padding: '11px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 11, fontWeight: 700, padding: '2px 7px' }),
  infoBox: { ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 10 },
  adminCard: { ...GLASS.card, borderRadius: RADIUS.lg, padding: '14px 16px', marginBottom: 8 },
  statRow: { display: 'flex', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, ...GLASS.card, borderRadius: RADIUS.lg, padding: '12px', textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 800, color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  streetCard: { margin: '0 12px 8px', ...GLASS.card, borderRadius: RADIUS.lg, padding: '16px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: 15 },
  actionBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 },
  reportBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer', padding: 0 },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return t('time_just_now');
  if (diff < 3600) return t('time_min_ago', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time_hour_ago', { n: Math.floor(diff / 3600) });
  if (diff < 172800) return t('time_yesterday');
  return new Date(ts).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'short' });
}

function Chevron({ size = 14, color, rotate = 0, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || COLORS.textMuted} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, pointerEvents: 'none', transition: 'transform 0.2s', transform: `rotate(${rotate}deg)`, ...style }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function CatBadge({ cat }) {
  return (
    <span style={{
      display: 'inline-block',
      background: 'rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: RADIUS.pill,
      fontSize: 11, fontWeight: 600,
      color: COLORS.textMuted,
      padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {catLabel(cat)}
    </span>
  );
}

function RoleBadge({ role }) {
  const map = { admin: [COLORS.accent, 'Admin'], moderator: [COLORS.purple, 'Mod'], resident: [COLORS.textDim, 'Bewoner'] };
  const [color, label] = map[role] || [COLORS.textDim, role];
  return <span style={s.badge(color)}>{label}</span>;
}

// ─── RSVP BAR ──────────────────────────────────────────────────────────────────

function AttendanceToggle({ post, onRsvp }) {
  const attending = post.my_rsvp === 'yes';
  const count = (post.rsvp?.yes || []).length;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}
        onClick={e => { e.stopPropagation(); onRsvp(post.id, 'yes'); }}>
        <div style={{ width: 44, height: 26, borderRadius: 13, background: attending ? COLORS.green : 'rgba(0,0,0,0.15)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: attending ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: attending ? 700 : 400, color: attending ? COLORS.text : COLORS.textMuted, cursor: 'pointer' }}>Ik ben erbij</span>
      </div>
      {count > 0 && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 2 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          {count} aanwezig
        </div>
      )}
    </div>
  );
}

// ─── INCIDENT EXTRA ────────────────────────────────────────────────────────────

function RdwLookup({ kenteken }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const clean = kenteken.replace(/-/g, '').toUpperCase();

  const lookup = async () => {
    if (clean.length < 4) return;
    setLoading(true); setError(null); setResult(null); setConfirmed(false);
    try {
      const data = await api.get(`/rdw/${clean}`);
      setResult(data);
    } catch (e) {
      setError(e.status === 404 ? t('rdw_not_found') : t('rdw_error'));
    }
    setLoading(false);
  };

  if (!clean || clean.length < 4) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {!result && !loading && !error && (
        <button onClick={lookup} style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.blue}`, borderRadius: 8, padding: '9px 12px', color: COLORS.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {t('rdw_lookup')}
        </button>
      )}
      {loading && <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>{t('rdw_loading')}</div>}
      {error && <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.red }}>{error}</div>}
      {result && !confirmed && (
        <div style={{ background: `${COLORS.blue}18`, border: `1px solid ${COLORS.blue}44`, borderRadius: RADIUS.lg, padding: '12px 14px', marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.blue, marginBottom: 8 }}>{t('rdw_only_you')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {[['Merk', result.merk], ['Type', result.type], ['Kleur', result.kleur], ['Bouwjaar', result.bouwjaar]].map(([label, val]) => (
              <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{t('rdw_warning')}</div>
          <button onClick={() => setConfirmed(true)} style={{ width: '100%', background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('rdw_confirm')}</button>
        </div>
      )}
      {confirmed && result && (
        <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.green }}>
          ✓ {result.merk} {result.type} · {result.kleur} · {result.bouwjaar} — opgeslagen voor jouw aangifte
        </div>
      )}
    </div>
  );
}

const MELDING_LINKS = {
  overlast: [{ label: 'Overlast melden bij Gemeente Amsterdam', url: 'https://meldingen.amsterdam.nl/', color: COLORS.blue }],
  schade: [
    { label: 'Aangifte doen bij politie', url: 'https://www.politie.nl/aangifte-of-melding-doen', color: COLORS.red },
    { label: 'Schade melden Waarborgfonds', url: 'https://www.svn.nl/', color: COLORS.blue },
  ],
  verdacht: [
    { label: 'Bel 0900-8844 (politie non-spoed)', url: 'tel:09008844', color: COLORS.red },
    { label: 'Meld Misdaad Anoniem', url: 'https://www.meldmisdaadanoniem.nl', color: COLORS.blue },
  ],
};

function MeldingLinks({ post }) {
  const links = MELDING_LINKS[post.sub_type] || [];
  if (!post.location && !post.license_plate && !links.length) return null;
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {post.location && (
        <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted }}>
          <span style={{ fontWeight: 700, color: COLORS.text }}>Locatie: </span>{post.location}
        </div>
      )}
      {post.license_plate && (
        <div style={{ ...s.infoBox, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, textTransform: 'uppercase' }}>Kenteken</span>
          <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, background: '#FFD700', color: '#000', padding: '2px 10px', borderRadius: 4, letterSpacing: '2px' }}>{post.license_plate}</span>
        </div>
      )}
      {links.map(({ label, url, color }) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', border: `1px solid ${color}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color, textDecoration: 'none' }}>
          {label} →
        </a>
      ))}
    </div>
  );
}

// ─── CARRIER BADGE ─────────────────────────────────────────────────────────────

const CARRIERS = ['PostNL', 'DHL', 'DPD', 'GLS', 'FedEx', 'UPS', 'Bol.com', 'Coolblue'];

const CARRIER_COLORS = {
  'PostNL':   { bg: '#FF6600', color: '#fff' },
  'DHL':      { bg: '#FFCC00', color: '#CC0605' },
  'DPD':      { bg: '#414042', color: '#DC0032' },
  'GLS':      { bg: '#009900', color: '#fff' },
  'FedEx':    { bg: '#4D148C', color: '#FF6600' },
  'UPS':      { bg: '#351C15', color: '#FFB500' },
  'Bol.com':  { bg: '#0000A4', color: '#fff' },
  'Coolblue': { bg: '#003878', color: '#fff' },
  'Amazon':   { bg: '#FF9900', color: '#000' },
};

// Klein SVG-pakket icoon — geen copyright, eigen vorm
function PkgIcon({ color }) {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none"
      stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z"/>
      <path d="M1 4.5L7 8L13 4.5"/>
      <line x1="7" y1="8" x2="7" y2="13"/>
      <path d="M4 2.75L10 6.25"/>
    </svg>
  );
}

function CarrierBadge({ carrier }) {
  const style = CARRIER_COLORS[carrier];
  if (!style) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...s.badge(COLORS.blue), fontSize: 11, padding: '3px 8px' }}>
        <PkgIcon color={COLORS.blue} />{carrier}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: style.bg, color: style.color,
      borderRadius: 4, fontSize: 10, fontWeight: 800,
      padding: '3px 8px', letterSpacing: '0.3px',
    }}>
      <PkgIcon color={style.color} />{carrier}
    </span>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onRsvp, onOpenEvent, onReport, onOpenJoin, canModerate, onEdit, canEdit, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const [threadComments, setThreadComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (expanded && threadComments === null) {
      api.get(`/streets/1/posts/${post.id}/comments`)
        .then(data => setThreadComments(data))
        .catch(() => setThreadComments([]));
    }
  }, [expanded]);

  const submitComment = async (e) => {
    e.stopPropagation();
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const comment = await api.post(`/streets/1/posts/${post.id}/comments`, { body: commentText.trim() });
      setThreadComments(prev => [...(prev || []), { ...comment, author_name: user?.name, author_house: user?.house_number, author_role: user?.role }]);
      setCommentText('');
    } catch {}
    setSendingComment(false);
  };

  const commentCount = parseInt(post.comments) || 0;
  const isEvent    = post.category === 'evenement' || post.category === 'event';
  const isIncident = post.category === 'melding'   || post.category === 'incident';
  const isPackage  = post.category === 'bezorging' || post.category === 'package';
  const isWorks    = post.category === 'straatzaken' || post.category === 'works' || ['blockage', 'container'].includes(post.category);

  // FRE-265: datum-badge logica
  const getDateLabel = () => {
    if (isEvent && post.event_date) return formatEventDate(post.event_date);
    if (isWorks) {
      const fmt = (d) => {
        const [y, m, day] = d.substring(0, 10).split('-');
        return new Date(+y, +m - 1, +day).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      };
      const timePart = post.start_time || post.end_time
        ? ` · ${post.start_time || '?'}–${post.end_time || '?'}`
        : '';
      if (post.start_date && post.end_date) return `${fmt(post.start_date)} – ${fmt(post.end_date)}${timePart}`;
      if (post.end_date) return `t/m ${fmt(post.end_date)}${timePart}`;
      if (timePart) return timePart.replace(' · ', '');
    }
    return null;
  };
  const dateLabel = getDateLabel();

  const firstName = (post.author_name || '').split(' ')[0] || 'Bewoner';

  return (
    <div style={s.card(post.pinned)}>
      {/* ── Klikbare header (altijd zichtbaar) ── */}
      <div className="tap-feedback" style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
            <span style={{ color: COLORS.textDim, fontWeight: 400 }}>
              {(() => {
                const INCIDENT_LBL = { lost_found: 'Lost & Found', overlast: 'Overlast', schade: 'Schade', verdacht: 'Verdachte situatie' };
                const WORKS_LBL   = { steiger: 'Steiger', werkzaamheden: 'Werkzaamheden', parkeerreservering: 'Parkeerreservering', container: 'Container', kraan: 'Kraan', verhuizing: 'Verhuizing' };
                let second = null;
                if (isPackage) {
                  if (post.sub_type === 'gezocht' || post.sub_type === 'search') second = 'Gezocht';
                  else if (post.sub_type === 'bezorgd' || post.sub_type === 'have') second = 'Bezorgd';
                } else if (isIncident && post.sub_type) {
                  second = INCIDENT_LBL[post.sub_type] || null;
                } else if (isWorks) {
                  second = WORKS_LBL[post.sub_type] || dateLabel;
                } else {
                  second = dateLabel || null;
                }
                return [catLabel(post.category), second].filter(Boolean).join(' · ') + ' · ';
              })()}
            </span>
            {post.title}
          </div>
          <Chevron size={18} rotate={expanded ? 180 : 0} style={{ flexShrink: 0, marginTop: 3 }} />
        </div>
        {/* Altijd zichtbare onderste rij: voornaam · tijd · reacties */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: COLORS.textDim }}>
          <span style={{ fontWeight: 600, color: COLORS.textMuted }}>
            {firstName}{post.author_house ? ` ${post.author_house}` : ''}
          </span>
          <span>·</span><span>{timeAgo(post.created_at)}</span>
          {commentCount > 0 && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                {commentCount}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Uitgeklapte inhoud ── */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
          {post.body && <div style={s.cardBody}>{post.body}</div>}
          {isWorks && post.location && (
            <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: COLORS.text }}>Lokatie: </span>{post.location}
            </div>
          )}
          {isEvent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {post.event_date && <div style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>Wanneer: </strong>{formatEventDate(post.event_date)}{post.event_time ? ` om ${post.event_time}` : ''}</div>}
              {post.event_location && <div style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>Waar: </strong>{post.event_location}</div>}
            </div>
          )}
          {isEvent && <AttendanceToggle post={post} onRsvp={onRsvp} />}
          {isIncident && <MeldingLinks post={post} />}
          {post.photo_url && (
            <img
              src={post.photo_url}
              alt=""
              style={{ width: '100%', borderRadius: 8, marginTop: 8, objectFit: 'cover', maxHeight: 240 }}
              onError={e => e.target.style.display = 'none'}
            />
          )}
          {post.carrier && (
            <div style={{ marginTop: 8 }}>
              <CarrierBadge carrier={post.carrier} />
            </div>
          )}
          {isPackage && canEdit && onResolve && (
            <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
              {post.resolved ? (
                <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: COLORS.textDim, cursor: 'pointer' }}
                  onClick={() => onResolve(post.id, false)}>
                  {post.sub_type === 'gezocht' || post.sub_type === 'search' ? 'Toch niet gevonden' : 'Toch niet opgehaald'}
                </div>
              ) : (
                <button onClick={() => onResolve(post.id, true)}
                  style={{ width: '100%', background: COLORS.text, color: '#fff', border: 'none', borderRadius: RADIUS.pill, padding: '11px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {post.sub_type === 'gezocht' || post.sub_type === 'search' ? 'Pakket gevonden' : 'Pakket opgehaald'}
                </button>
              )}
            </div>
          )}
          {post.link && (
            <a href={post.link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 8, fontSize: 12, color: COLORS.blue, textDecoration: 'underline', wordBreak: 'break-all' }}>
              {post.link}
            </a>
          )}
          {post.attachment_name && (
            <div style={{ marginTop: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {post.attachment_name}
            </div>
          )}
          {post.allow_join && (
            <button onClick={e => { e.stopPropagation(); onOpenJoin(post); }}
              style={{ marginTop: 10, width: '100%', background: post.my_join ? `${COLORS.green}22` : COLORS.bg, border: `1px solid ${post.my_join ? COLORS.green : COLORS.border}`, borderRadius: 8, padding: '8px 12px', color: post.my_join ? COLORS.green : COLORS.textMuted, fontSize: 13, fontWeight: post.my_join ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
              {post.my_join ? t('join_card') : t('join_cta')} <span style={{ color: COLORS.textDim, fontWeight: 400 }}>· {(post.joiners||[]).length} {t('join_participants').toLowerCase()}</span>
            </button>
          )}
          {/* Comments-thread */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
            {threadComments === null && (
              <div style={{ fontSize: 12, color: COLORS.textDim, paddingBottom: 8 }}>Reacties laden…</div>
            )}
            {(threadComments || []).map((c, i) => (
              <div key={c.id ?? i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 2 }}>
                  {(c.author_name || '').split(' ')[0] || 'Bewoner'}{c.author_house ? ` ${c.author_house}` : ''}
                </div>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{c.body}</div>
              </div>
            ))}
            {threadComments !== null && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 4 }} onClick={e => e.stopPropagation()}>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(e); } }}
                  placeholder="Reageer…"
                  rows={1}
                  style={{ ...s.textarea, flex: 1, padding: '8px 10px', fontSize: 16, height: 'auto', marginBottom: 0 }}
                />
                <button onClick={submitComment} disabled={!commentText.trim() || sendingComment}
                  style={{ background: commentText.trim() ? COLORS.accent : COLORS.border, color: commentText.trim() ? '#000' : COLORS.textDim, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: commentText.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}>
                  {sendingComment ? '…' : 'Stuur'}
                </button>
              </div>
            )}
          </div>

          {/* Acties */}
          <div style={{ ...s.cardMeta, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={s.cardMetaLeft}>
              <button style={{ ...s.actionBtn, gap: 5, color: post.liked ? COLORS.red : COLORS.textDim }} onClick={e => { e.stopPropagation(); onLike(post.id); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span>{post.likes}</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {canEdit && (
                <button style={{ ...s.actionBtn, color: COLORS.textDim }} onClick={e => { e.stopPropagation(); onEdit(post); }} title="Bewerken">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              {canModerate ? (
                <button style={{ ...s.actionBtn, color: COLORS.textDim }} onClick={e => { e.stopPropagation(); onReport(post.id); }} title={t('delete')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              ) : (
                <button style={{ ...s.actionBtn, color: post.reported ? COLORS.red : COLORS.textDim }} onClick={e => { e.stopPropagation(); onReport(post.id); }} title={t('report')}>
                  {post.reported ? 'Gemeld' : t('report')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CATEGORY PICKER SHEET ────────────────────────────────────────────────────

const CAT_META = {
  bezorging:   { emoji: '📦', sub: 'Bezorging & vermist pakket' },
  straatzaken: { emoji: '🚧', sub: 'Werkzaamheden in de straat' },
  melding:     { emoji: '⚠️', sub: 'Iets melden aan de buurt' },
  evenement:   { emoji: '🎉', sub: 'Buurtactiviteit organiseren' },
};

function CategoryPickerSheet({ onClose, onSelect }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetHandle} />
      <div style={s.sheetTitle}>Wat wil je delen?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {Object.entries(CATEGORIES).map(([key]) => {
          const meta = CAT_META[key] || {};
          return (
            <div key={key}
              onClick={() => { setClosing(true); setTimeout(() => onSelect(key), 270); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: RADIUS.lg, padding: '14px 16px', cursor: 'pointer' }}>
              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{meta.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{catLabel(key)}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{meta.sub}</div>
              </div>
              <Chevron size={16} color={COLORS.textDim} />
            </div>
          );
        })}
      </div>
      <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

// ─── SHEET OVERLAY WRAPPER ────────────────────────────────────────────────────

function SheetOverlay({ closing, onOverlayClick, children }) {
  return (
    <div
      style={{ ...s.overlay, animation: `${closing ? 'overlayOut 0.27s ease-in' : 'overlayIn 0.22s ease-out'} forwards` }}
      onClick={onOverlayClick}
    >
      <div
        style={{ ...s.sheet, animation: `${closing ? 'sheetOut 0.27s ease-in' : 'sheetIn 0.32s cubic-bezier(0.22,1,0.36,1)'} forwards` }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── EVENT DETAIL SHEET ────────────────────────────────────────────────────────

function EventDetailSheet({ post, onClose, onRsvp }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };
  const yes = post.rsvp?.yes || [];
  const maybe = post.rsvp?.maybe || [];
  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <CatBadge cat={post.category} />
          {post.pinned && <span style={s.pinnedBadge}>Pinned</span>}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{post.title}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>{post.body}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>Wanneer: </strong>{formatEventDate(post.event_date)} om {post.event_time}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>Waar: </strong>{post.event_location}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>{yes.length}</strong> komen · <strong style={{ color: COLORS.text }}>{maybe.length}</strong> misschien</div>
        </div>
        {post.bring_list?.length > 0 && (
          <>
            <div style={s.label}>{t('bring_items')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {post.bring_list.map(item => <span key={item} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 12, color: COLORS.textMuted }}>{item}</span>)}
            </div>
          </>
        )}
        <div style={s.label}>{t('rsvp_your')}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['yes',t('rsvp_yes'),COLORS.green],['maybe',t('rsvp_maybe'),COLORS.orange],['no',t('rsvp_no'),COLORS.red]].map(([type,label,color]) => (
            <button key={type} onClick={() => onRsvp(post.id, type)}
              style={{ flex: 1, background: post.my_rsvp === type ? `${color}22` : COLORS.bg, border: `1px solid ${post.my_rsvp === type ? color : COLORS.border}`, borderRadius: 8, padding: '10px 4px', color: post.my_rsvp === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: post.my_rsvp === type ? 700 : 400, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {yes.length > 0 && (
          <>
            <div style={s.label}>{t('attendees')} ({yes.length})</div>
            <div style={{ ...s.infoBox, marginBottom: 16 }}>
              {yes.map((name, i) => (
                <div key={name} style={{ fontSize: 13, padding: '4px 0', borderBottom: i < yes.length - 1 ? `1px solid ${COLORS.border}` : 'none', color: COLORS.textMuted }}>
                  {name === post.author_name ? <strong style={{ color: COLORS.text }}>{name} (organisator)</strong> : name}
                </div>
              ))}
            </div>
          </>
        )}
        <div style={s.label}>{t('calendar_add')}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => downloadICS(post)}
            style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 6px', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer' }}>
            Download .ics
          </button>
          <a href={googleCalendarUrl(post)} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 6px', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {t('calendar_google')}
          </a>
        </div>
        <button style={s.cancelBtn} onClick={close}>{t('close')}</button>
    </SheetOverlay>
  );
}

// ─── CALENDAR HELPERS ──────────────────────────────────────────────────────────

const DUTCH_MONTHS = { 'januari':0,'februari':1,'maart':2,'april':3,'mei':4,'juni':5,'juli':6,'augustus':7,'september':8,'oktober':9,'november':10,'december':11 };

function parseEventDate(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d, h || 0, m || 0);
  }
  const p = dateStr.trim().split(' ');
  if (p.length < 3) return null;
  const month = DUTCH_MONTHS[p[1]?.toLowerCase()];
  if (month === undefined) return null;
  return new Date(parseInt(p[2]), month, parseInt(p[0]), h || 0, m || 0);
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return dateStr;
}

function toICSDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function downloadICS(post) {
  const start = parseEventDate(post.event_date, post.event_time);
  if (!start) return;
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Streetfeed//NL',
    'BEGIN:VEVENT',
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${post.title}`,
    `DESCRIPTION:${(post.body||'').replace(/\n/g,'\\n')}`,
    `LOCATION:${post.event_location||''}`,
    'END:VEVENT','END:VCALENDAR',
  ].join('\r\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })),
    download: 'evenement.ics',
  });
  a.click();
}

function googleCalendarUrl(post) {
  const start = parseEventDate(post.event_date, post.event_time);
  if (!start) return '#';
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(post.body||'')}&location=${encodeURIComponent(post.event_location||'')}`;
}

// ─── JOIN DETAIL SHEET ─────────────────────────────────────────────────────────

function JoinDetailSheet({ post, onClose, onJoin }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };
  const joiners = post.joiners || [];
  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
        <div style={s.sheetHandle} />
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{post.title}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
          {joiners.length} {joiners.length === 1 ? t('join_count_one') : t('join_count_many')}
        </div>
        <button onClick={() => onJoin(post.id)}
          style={{ width: '100%', background: post.my_join ? `${COLORS.green}22` : COLORS.bg, border: `1px solid ${post.my_join ? COLORS.green : COLORS.border}`, borderRadius: 8, padding: '12px', color: post.my_join ? COLORS.green : COLORS.textMuted, fontSize: 14, fontWeight: post.my_join ? 700 : 400, cursor: 'pointer', marginBottom: 16 }}>
          {post.my_join ? t('join_active') : t('join_cta')}
        </button>
        {joiners.length > 0 && (
          <>
            <div style={s.label}>{t('join_participants')} ({joiners.length})</div>
            <div style={s.infoBox}>
              {joiners.map((name, i) => (
                <div key={name} style={{ fontSize: 13, padding: '4px 0', borderBottom: i < joiners.length - 1 ? `1px solid ${COLORS.border}` : 'none', color: COLORS.textMuted }}>{name}</div>
              ))}
            </div>
          </>
        )}
        <button style={s.cancelBtn} onClick={close}>{t('close')}</button>
    </SheetOverlay>
  );
}

// ─── EDIT POST SHEET ───────────────────────────────────────────────────────────

function EditPostSheet({ post, onClose, onSave }) {
  const toDateInput = (d) => d ? d.substring(0, 10) : '';

  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body || '');
  const [startDate, setStartDate] = useState(toDateInput(post.start_date));
  const [endDate, setEndDate] = useState(toDateInput(post.end_date));
  const [eventDate, setEventDate] = useState(post.event_date || '');
  const [eventTime, setEventTime] = useState(post.event_time || '');
  const [eventLocation, setEventLocation] = useState(post.event_location || '');
  const [carrier, setCarrier] = useState(post.carrier || '');
  const [link, setLink] = useState(post.link || '');
  const [startTime, setStartTime] = useState(post.start_time || '');
  const [endTime, setEndTime] = useState(post.end_time || '');
  const [allowJoin, setAllowJoin] = useState(!!post.allow_join);
  const [location, setLocation] = useState(post.location || '');
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  const isEvent      = post.category === 'evenement' || post.category === 'event';
  const isPackage    = post.category === 'bezorging' || post.category === 'package';
  const hasDateRange = ['straatzaken', 'works', 'blockage', 'container'].includes(post.category);
  const hasTimeRange = post.category === 'straatzaken' || post.category === 'works';
  const hasLink      = ['straatzaken', 'works', 'blockage', 'container', 'waste'].includes(post.category);
  const hasLocation  = ['straatzaken', 'melding', 'works', 'incident', 'blockage', 'container'].includes(post.category);

  return (
    <SheetOverlay closing={closing}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={s.sheetTitle}>Bericht bewerken</div>
          <CatBadge cat={post.category} />
        </div>

        <label style={s.label}>{t('title')}</label>
        <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} />

        <label style={s.label}>{t('message')}</label>
        <textarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} />

        {hasLocation && (
          <>
            <label style={s.label}>Locatie</label>
            <input style={s.input} placeholder="bijv. nr. 27 of nr. 27–34" value={location} onChange={e => setLocation(e.target.value)} />
          </>
        )}

        {hasDateRange && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={s.label}>Startdatum (optioneel)</label>
                <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              {hasTimeRange && (
                <div>
                  <label style={s.label}>Starttijd (optioneel)</label>
                  <input style={s.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={s.label}>Einddatum (optioneel)</label>
                <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              {hasTimeRange && (
                <div>
                  <label style={s.label}>Eindtijd (optioneel)</label>
                  <input style={s.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        {isEvent && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={s.label}>{t('event_date')}</label>
                <input style={s.input} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>{t('event_time')}</label>
                <input style={s.input} type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
              </div>
            </div>
            <label style={s.label}>{t('event_location')}</label>
            <input style={s.input} value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
          </>
        )}

        {isPackage && (
          <>
            <label style={s.label}>Bezorger</label>
            <select value={carrier} onChange={e => setCarrier(e.target.value)}
              style={{ ...s.input, cursor: 'pointer', marginBottom: 10, paddingRight: 42 }}>
              <option value="">Selecteer bezorger (optioneel)</option>
              {['PostNL','DHL','DPD','GLS','Bol.com','Coolblue','Amazon','Anders'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}

        {hasLink && (
          <>
            <label style={s.label}>Externe link (optioneel)</label>
            <input style={s.input} placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
          </>
        )}


        <button style={s.submitBtn} disabled={!title.trim()} onClick={() => {
          onSave(post.id, {
            title, body,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            eventDate: eventDate || undefined,
            eventTime: eventTime || undefined,
            eventLocation: eventLocation || undefined,
            carrier: carrier || undefined,
            link: link || undefined,
            location: hasLocation ? (location || undefined) : undefined,
            allowJoin: allowJoin,
          });
          close();
        }}>
          Opslaan
        </button>
        <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

// ─── ACTION MENU ───────────────────────────────────────────────────────────────

function ActionMenu({ items, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '0 12px 20px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 8 }}>
          {items.map((item, i) => (
            <div key={i}>
              {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 16px' }} />}
              <div onClick={item.action} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 16, color: item.destructive ? COLORS.red : COLORS.text, fontWeight: 400, cursor: 'pointer' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: RADIUS.xl, padding: '14px', fontSize: 16, fontWeight: 700, color: COLORS.accent, border: 'none', cursor: 'pointer' }}>
          Annuleer
        </button>
      </div>
    </div>
  );
}

// ─── BIJLAGE UPLOAD ────────────────────────────────────────────────────────────

function AttachmentUpload({ onPhotoUploaded, onDocumentChosen, photoPreview, documentName, uploading, onUploading }) {
  const [showMenu, setShowMenu] = useState(false);
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onPhotoUploaded(URL.createObjectURL(file), null);
    onUploading?.(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) throw new Error('Upload mislukt');
      const { key } = await res.json();
      onPhotoUploaded(URL.createObjectURL(file), key);
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      onUploading?.(false);
    }
  };

  const hasAttachment = photoPreview || documentName;

  return (
    <>
      <button type="button" onClick={() => setShowMenu(true)}
        style={{ width: '100%', background: COLORS.bg, border: `1px solid ${hasAttachment ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: hasAttachment ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', marginBottom: 4 }}>
        {uploading ? 'Uploaden…' : hasAttachment ? (documentName || 'Foto gekozen') : 'Bijlage toevoegen'}
      </button>
      {photoPreview && <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 10, objectFit: 'cover', maxHeight: 160 }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
        onChange={e => { onDocumentChosen(e.target.files[0]?.name || null); setShowMenu(false); }} />
      {showMenu && (
        <ActionMenu
          onClose={() => setShowMenu(false)}
          items={[
            { label: 'Foto maken', action: () => { setShowMenu(false); cameraRef.current?.click(); } },
            { label: 'Kies foto', action: () => { setShowMenu(false); photoRef.current?.click(); } },
            { label: 'Kies bestand', action: () => { setShowMenu(false); docRef.current?.click(); } },
          ]}
        />
      )}
    </>
  );
}

// ─── TYPE PICKER + NEW POST SHEET ─────────────────────────────────────────────

const TYPE_META = {
  bezorging: [
    { key: 'bezorgd', label: 'Bezorgd', sub: 'Pakket ontvangen voor een buur',   emoji: '📦' },
    { key: 'gezocht', label: 'Gezocht', sub: 'Op zoek naar een vermist pakket',  emoji: '🔍' },
  ],
  straatzaken: [
    { key: 'werkzaamheden',      label: 'Werkzaamheden',      emoji: '🔧' },
    { key: 'parkeerreservering', label: 'Parkeerreservering', emoji: '🚗' },
    { key: 'steiger',            label: 'Steiger',            emoji: '🏗️' },
    { key: 'container',          label: 'Container',          emoji: '🗑️' },
    { key: 'kraan',              label: 'Kraan',              emoji: '🏗️' },
    { key: 'verhuizing',         label: 'Verhuizing',         emoji: '📦' },
  ],
  melding: [
    { key: 'lost_found', label: 'Lost & Found',       sub: 'Gevonden of verloren voorwerp',          emoji: '🔑' },
    { key: 'overlast',   label: 'Overlast',           sub: 'Geluids-, parkeer- of andere overlast',  emoji: '🔊' },
    { key: 'schade',     label: 'Schade',             sub: 'Schade aan eigendom of voertuig',        emoji: '⚠️' },
    { key: 'verdacht',   label: 'Verdachte situatie', sub: 'Onraad of verdacht gedrag',              emoji: '👁️' },
  ],
};

function typeLabel(cat, type) {
  return TYPE_META[cat]?.find(t => t.key === type)?.label || type;
}

function TypePickerSheet({ cat, onClose, onSelect }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };
  const types = TYPE_META[cat] || [];
  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetHandle} />
      <div style={s.sheetTitle}>{catLabel(cat)} — welk type?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {types.map(({ key, label: lbl, sub, emoji }) => (
          <div key={key}
            onClick={() => { setClosing(true); setTimeout(() => onSelect(key), 270); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: RADIUS.lg, padding: '14px 16px', cursor: 'pointer' }}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{lbl}</div>
              {sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{sub}</div>}
            </div>
            <Chevron size={16} color={COLORS.textDim} />
          </div>
        ))}
      </div>
      <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

function LocationPicker({ value, onChange }) {
  const [mode, setMode] = useState('single');
  const [single, setSingle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const update = (m, s, f, t_) => {
    if (m === 'single') onChange(s ? `nr. ${s}` : '');
    else onChange(f && t_ ? `nr. ${f}–${t_}` : '');
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[['single', 'Enkel nummer'], ['range', 'Reeks']].map(([m, lbl]) => (
          <div key={m} style={{ ...s.filterChip(mode === m), fontSize: 12 }}
            onClick={() => { setMode(m); update(m, single, from, to); }}>
            {lbl}
          </div>
        ))}
      </div>
      {mode === 'single' ? (
        <input style={s.input} placeholder="Bijv. 27" value={single}
          onChange={e => { setSingle(e.target.value); update('single', e.target.value, from, to); }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
          <input style={{ ...s.input, marginBottom: 0 }} placeholder="Van nr." value={from}
            onChange={e => { setFrom(e.target.value); update('range', single, e.target.value, to); }} />
          <span style={{ color: COLORS.textDim, fontSize: 13, textAlign: 'center' }}>t/m</span>
          <input style={{ ...s.input, marginBottom: 0 }} placeholder="Tot nr." value={to}
            onChange={e => { setTo(e.target.value); update('range', single, from, e.target.value); }} />
        </div>
      )}
    </div>
  );
}

function NewPostSheet({ onClose, onSubmit, streetId, canPin, user, initialCat = 'bezorging', initialType = null }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [forHouse, setForHouse] = useState('');
  const [carrier, setCarrier] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [link, setLink] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [photoKey, setPhotoKey] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  const isBezorging   = initialCat === 'bezorging'   || initialCat === 'package';
  const isStraatzaken = initialCat === 'straatzaken'  || initialCat === 'works';
  const isMelding     = initialCat === 'melding'      || initialCat === 'incident';
  const isEvenement   = initialCat === 'evenement'    || initialCat === 'event';
  const isBezorgd     = initialType === 'bezorgd';
  const isGezocht     = initialType === 'gezocht';

  const autoTitle = forHouse.trim()
    ? isGezocht
      ? `Pakket gezocht voor nr. ${forHouse.trim()}`
      : `Pakket voor nr. ${forHouse.trim()}`
    : '';

  const canSubmit = !uploading && (isBezorging
    ? !!forHouse.trim()
    : isMelding
      ? !!(title.trim() && body.trim())
      : isEvenement
        ? !!(title.trim() && eventDate)
        : !!title.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      category: initialCat,
      subType: initialType || undefined,
      title: isBezorging ? autoTitle : title.trim(),
      body: body.trim() || undefined,
      location: (isStraatzaken || isMelding) ? (location.trim() || undefined) : undefined,
      startDate: isStraatzaken ? (startDate || undefined) : undefined,
      endDate: (isStraatzaken || isEvenement) ? (endDate || undefined) : undefined,
      link: isStraatzaken ? (link.trim() || undefined) : undefined,
      carrier: (isBezorging && isBezorgd) ? (carrier || undefined) : undefined,
      eventDate: isEvenement ? (eventDate || undefined) : undefined,
      eventTime: isEvenement ? (eventTime || undefined) : undefined,
      eventLocation: isEvenement ? (eventLocation.trim() || undefined) : undefined,
      photoKey: photoKey || undefined,
      pinned: !!(canPin && isStraatzaken && startDate && endDate),
    });
    close();
  };

  const catTypeLine = `${catLabel(initialCat)}${initialType ? ' · ' + typeLabel(initialCat, initialType) : ''}`;

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetHandle} />
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>{t('new_post')}</div>
        <div style={{ fontSize: 12, color: COLORS.textDim }}>{catTypeLine}</div>
      </div>

      {/* Bezorging */}
      {isBezorging && (
        <>
          <label style={s.label}>{isGezocht ? 'Van welk huisnummer?' : 'Pakket voor huisnummer'}</label>
          <HouseNumberPicker value={forHouse} onChange={setForHouse} style={{ marginBottom: 10 }} />
          {autoTitle && <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 12 }}>Titel: <em>{autoTitle}</em></div>}
          {isBezorgd && (
            <>
              <label style={s.label}>Bezorger (optioneel)</label>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <select value={carrier} onChange={e => setCarrier(e.target.value)}
                  style={{ ...s.input, cursor: 'pointer', marginBottom: 0, paddingRight: 36, appearance: 'none', WebkitAppearance: 'none' }}>
                  <option value="">Onbekend</option>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Chevron size={14} color={COLORS.textDim} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </>
          )}
          <label style={s.label}>Beschrijving (optioneel)</label>
          <textarea style={{ ...s.textarea, height: 60 }} value={body} onChange={e => setBody(e.target.value)} />
          {isBezorgd && (
            <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading}
              onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); if (key) setPhotoKey(key); }} />
          )}
        </>
      )}

      {/* Straatzaken */}
      {isStraatzaken && (
        <>
          <label style={s.label}>Titel *</label>
          <input style={s.input} placeholder="Bijv. Vervanging gasleiding" value={title} onChange={e => setTitle(e.target.value)} />
          <label style={s.label}>Locatie (optioneel)</label>
          <input style={s.input} placeholder="Bijv. nr. 14–22" value={location} onChange={e => setLocation(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={s.label}>Van datum</label>
              <input type="date" style={{ ...s.input, marginBottom: 0 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Tot datum</label>
              <input type="date" style={{ ...s.input, marginBottom: 0 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          {canPin && startDate && endDate && (
            <div style={{ fontSize: 11, color: COLORS.textDim, margin: '6px 0 10px' }}>Wordt automatisch vastgepind t/m einddatum.</div>
          )}
          <label style={{ ...s.label, marginTop: 10 }}>Link (optioneel)</label>
          <input type="url" style={s.input} placeholder="https://…" value={link} onChange={e => setLink(e.target.value)} />
          <label style={s.label}>Extra info (optioneel)</label>
          <textarea style={{ ...s.textarea, height: 60 }} value={body} onChange={e => setBody(e.target.value)} />
        </>
      )}

      {/* Melding */}
      {isMelding && (
        <>
          <label style={s.label}>Onderwerp *</label>
          <input style={s.input} placeholder="Kort en duidelijk" value={title} onChange={e => setTitle(e.target.value)} />
          <label style={s.label}>Beschrijving *</label>
          <textarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} />
          <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading}
            onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); if (key) setPhotoKey(key); }} />
        </>
      )}

      {/* Evenement */}
      {isEvenement && (
        <>
          <label style={s.label}>Naam *</label>
          <input style={s.input} placeholder="Bijv. Straatborrel Kerst" value={title} onChange={e => setTitle(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Datum *</label>
              <input type="date" style={{ ...s.input, marginBottom: 0 }} value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Tijdstip</label>
              <input type="time" style={{ ...s.input, marginBottom: 0 }} value={eventTime} onChange={e => setEventTime(e.target.value)} />
            </div>
          </div>
          <label style={s.label}>Beschrijving (optioneel)</label>
          <textarea style={{ ...s.textarea, height: 60 }} value={body} onChange={e => setBody(e.target.value)} />
          <label style={s.label}>Locatie (optioneel)</label>
          <input style={s.input} placeholder="Bijv. bij nr. 34 of Vondelpark" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
          <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading}
            onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); if (key) setPhotoKey(key); }} />
          {canPin && (
            <>
              <label style={s.label}>Vastpinnen tot</label>
              <input type="date" style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </>
          )}
        </>
      )}


      <button style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit} onClick={handleSubmit}>
        {t('publish')}
      </button>
      <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────

function AdminView({ streetId, user, memberCount, households }) {
  const [subTab, setSubTab] = useState('queue');
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (subTab === 'queue') {
      api.get(`/streets/${streetId}/pending`).then(setPending).catch(() => {});
    }
    if (subTab === 'members') {
      api.get(`/streets/${streetId}/members`).then(setMembers).catch(() => {});
    }
  }, [subTab, streetId]);

  const approve = async (userId) => {
    await api.post(`/streets/${streetId}/pending/${userId}/approve`);
    setPending(p => p.filter(m => m.id !== userId));
  };

  const reject = async (userId) => {
    await api.delete(`/streets/${streetId}/pending/${userId}`);
    setPending(p => p.filter(m => m.id !== userId));
  };

  const changeRole = async (userId, role) => {
    await api.patch(`/streets/${streetId}/members/${userId}/role`, { role });
    setMembers(ms => ms.map(m => m.id === userId ? { ...m, role } : m));
  };

  return (
    <div style={s.feed}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 12px 0' }}>
        {[[['queue', t('requests')], ['members', t('residents_tab')], ['manage', t('manage_tab')]]].flat().map(([id, label]) => (
          <div key={id} style={s.filterChip(subTab === id)} onClick={() => setSubTab(id)}>{label}</div>
        ))}
      </div>

      {subTab === 'queue' && (
        <>
          <div style={{ ...s.statRow, padding: '12px 12px 0' }}>
            <div style={s.statCard}><div style={s.statNum}>{memberCount}</div><div style={s.statLabel}>{t('stat_residents')}</div></div>
            <div style={s.statCard}><div style={s.statNum}>{pending.length}</div><div style={s.statLabel}>{t('stat_pending')}</div></div>
            <div style={s.statCard}><div style={s.statNum}>{households}</div><div style={s.statLabel}>{t('stat_addresses')}</div></div>
          </div>
          <div style={s.sectionLabel}>{t('approval_queue')}</div>
          {pending.length === 0
            ? <div style={s.emptyState}>{t('no_pending')}</div>
            : pending.map(p => (
              <div key={p.id} style={{ ...s.adminCard, margin: '0 12px 8px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
                  {p.house_number ? `nr. ${p.house_number}` : p.email} · {timeAgo(p.created_at)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, background: COLORS.accent, color: '#000', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => approve(p.id)}>{t('approve')}</button>
                  <button style={{ flex: 1, background: 'none', color: COLORS.red, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer' }} onClick={() => reject(p.id)}>{t('reject')}</button>
                </div>
              </div>
            ))}
        </>
      )}

      {subTab === 'members' && (
        <>
          <div style={s.sectionLabel}>{t('members_list')} ({members.length})</div>
          {members.map(m => (
            <div key={m.id} style={{ ...s.adminCard, margin: '0 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.house_number ? `nr. ${m.house_number}` : m.email}</div>
              </div>
              <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                <option value="resident">Bewoner</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </>
      )}

      {subTab === 'manage' && (
        <div style={{ padding: '12px 12px 0' }}>
          {[t('pins_manage'), t('street_settings'), t('invite_link'), t('statistics')].map(item => (
            <div key={item} style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 13 }}>{item}</span>
              <span style={{ color: COLORS.textDim }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS VIEW ─────────────────────────────────────────────────────────────

function SettingsView({ user, onLogout }) {
  const [lang, setLangState] = useState(getLang());
  const [notifs, setNotifs] = useState({});
  const { permission, subscribed, subscribe } = usePush();
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);

  useEffect(() => {
    api.get('/push/settings').then(data => setNotifs(prev => ({ ...Object.fromEntries(Object.keys(CATEGORIES).map(k => [k, true])), ...data }))).catch(() => {});
  }, []);

  const toggleNotif = async (key) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    await api.patch('/push/settings', { settings: { [key]: next[key] } }).catch(() => {});
  };

  const switchLang = (l) => {
    setLang(l);
    setLangState(l);
  };

  const roleLabel = () => {
    if (user.is_super_admin) return t('super_admin');
    const m = user.memberships?.find(m => m.status === 'approved');
    if (!m) return t('pending_role');
    if (m.role === 'admin') return t('street_admin');
    if (m.role === 'moderator') return t('moderator');
    return t('resident');
  };

  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>{t('profile')}</div>
      <div style={{ padding: '0 12px' }}>
        {[{ label: t('name'), value: user.name }, { label: t('address'), value: user.house_number ? `Reyer Anslostraat ${user.house_number}` : '–' }, { label: t('role'), value: roleLabel() }].map(item => (
          <div key={item.label} style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
        <button style={{ ...s.cancelBtn, marginTop: 4 }} onClick={onLogout}>{t('logout')}</button>
      </div>

      <div style={s.sectionLabel}>{t('notifications')}</div>
      <div style={{ padding: '0 12px' }}>
        {isIOS && !subscribed && (
          <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{t('pwa_ios_hint')}</div>
        )}
        {notifSupported && !subscribed && permission !== 'denied' && (
          <button style={{ ...s.submitBtn, marginBottom: 12 }} onClick={subscribe}>{t('enable_notifications')}</button>
        )}
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <div key={key} style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{catLabel(key)}</span>
            <div onClick={() => toggleNotif(key)} style={{ width: 36, height: 20, borderRadius: 10, background: notifs[key] ? COLORS.accent : COLORS.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: notifs[key] ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: notifs[key] ? '#000' : COLORS.textDim, transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>{t('language')}</div>
      <div style={{ padding: '0 12px' }}>
        <div style={s.adminCard}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['nl', 'Nederlands'], ['en', 'English']].map(([code, label]) => (
              <div key={code} onClick={() => switchLang(code)} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: lang === code ? 700 : 400, background: lang === code ? COLORS.accent : 'none', color: lang === code ? '#000' : COLORS.textMuted, cursor: 'pointer' }}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.sectionLabel}>{t('privacy_title')}</div>
      <div style={{ padding: '0 12px' }}>
        <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{t('privacy_intro')}</div>
          {t('privacy_body').map(item => <div key={item} style={{ padding: '3px 0' }}>{item}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── STREETS VIEW ──────────────────────────────────────────────────────────────

function StreetsView({ user }) {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.get('/streets').then(setStreets).catch(() => {});
  }, []);

  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>{t('your_streets')}</div>
      {streets.filter(s => s.status === 'approved').map(st => (
        <div key={st.id} style={s.streetCard}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{st.name}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', gap: 12 }}>
            <span>{st.households} {t('households')}</span>
            <span>{st.members} {t('members')}</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            {st.role === 'admin' && <span style={s.badge(COLORS.accent)}>admin</span>}
            {st.role === 'moderator' && <span style={s.badge(COLORS.purple)}>mod</span>}
          </div>
        </div>
      ))}
      <div style={s.sectionLabel}>{t('other_streets')}</div>
      <div style={{ ...s.streetCard, opacity: 0.5 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('request_street')}</div>
      </div>
    </div>
  );
}

// ─── PENDING VIEW ──────────────────────────────────────────────────────────────

function PendingView() {
  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t('pending_title')}</div>
        <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>{t('pending_body')}</div>
      </div>
    </div>
  );
}

// ─── SEGMENTED CONTROL ────────────────────────────────────────────────────────

function SegmentedControl({ options, value, onChange, label, style }) {
  const selectedIndex = Math.max(0, options.findIndex(o => o.key === value));
  const scrollRef = useRef(null);
  const [pillGeom, setPillGeom] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tab = el.querySelector(`[data-tab="${selectedIndex}"]`);
    if (!tab) return;
    setPillGeom({ left: tab.offsetLeft, width: tab.offsetWidth });
  }, [selectedIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tab = el.querySelector(`[data-tab="${selectedIndex}"]`);
    if (!tab) return;
    const center = tab.offsetLeft - (el.offsetWidth - tab.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, center), behavior: 'smooth' });
  }, [value]);

  return (
    <div style={style}>
      {label && <div style={s.sectionLabel}>{label}</div>}
      <div style={{ padding: '0 19px 12px' }}>
        <div ref={scrollRef} style={{
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          background: 'rgba(255,255,255,0.32)',
          borderRadius: RADIUS.pill,
          padding: 8,
        }}>
          {/* witte pill — positie en breedte gemeten uit DOM */}
          <div style={{
            position: 'absolute',
            top: 8, left: pillGeom.left,
            height: 'calc(100% - 16px)', width: pillGeom.width,
            background: '#FFFFFF',
            borderRadius: RADIUS.pill,
            boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
            transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'none',
          }} />
          {options.map(({ key, label: optLabel }, idx) => (
            <div
              key={key}
              data-tab={idx}
              onClick={() => onChange(key)}
              style={{
                flexShrink: 0,
                height: 32,
                display: 'flex', alignItems: 'center',
                padding: '0 12px',
                fontSize: 13,
                fontWeight: value === key ? 700 : 500,
                color: value === key ? COLORS.accent : COLORS.textMuted,
                cursor: 'pointer', userSelect: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                position: 'relative', zIndex: 1,
              }}
            >
              {optLabel}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const { user, logout } = useAuth();
  const { permission, subscribed, subscribe } = usePush();
  const [tab, setTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [pendingCat, setPendingCat] = useState('bezorging');
  const [pendingType, setPendingType] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [joinDetail, setJoinDetail] = useState(null);
  const [reportedToast, setReportedToast] = useState(false);
  const [postError, setPostError] = useState('');
  const [streetInfo, setStreetInfo] = useState(null);
  const [editPost, setEditPost] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const STREET_ID = 1; // Reyer Anslostraat (first street)

  const membership = user?.memberships?.find(m => m.streetId === STREET_ID);
  const canModerate = user?.is_super_admin || ['admin', 'moderator'].includes(membership?.role);
  const canPin = user?.is_super_admin || membership?.role === 'admin';
  const pendingCount = 0; // Fetched in AdminView, badge handled separately

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/streets/${STREET_ID}/posts${filter !== 'all' ? `?category=${filter}` : ''}`);
      setPosts(data);
    } catch (e) {
      console.error('Failed to load posts', e);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (tab === 'feed') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      loadPosts();
    }
  }, [tab, loadPosts]);

  const wasDetailOpenRef = useRef(false);
  useEffect(() => {
    const isOpen = !!(eventDetail || joinDetail || editPost);
    if (wasDetailOpenRef.current && !isOpen && tab === 'feed') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      loadPosts();
    }
    wasDetailOpenRef.current = isOpen;
  }, [eventDetail, joinDetail, editPost, loadPosts, tab]);

  useEffect(() => {
    api.get(`/streets/${STREET_ID}`).then(setStreetInfo).catch(() => {});
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  const handleLike = async (id) => {
    const { liked } = await api.post(`/streets/${STREET_ID}/posts/${id}/like`);
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked, likes: liked ? p.likes + 1 : p.likes - 1 } : p));
  };

  const handleRsvp = async (id, type) => {
    const { rsvp } = await api.post(`/streets/${STREET_ID}/posts/${id}/rsvp`, { type });
    setPosts(ps => ps.map(p => {
      if (p.id !== id) return p;
      const r = { yes: [...(p.rsvp?.yes||[])], maybe: [...(p.rsvp?.maybe||[])], no: [...(p.rsvp?.no||[])] };
      if (p.my_rsvp) r[p.my_rsvp] = r[p.my_rsvp].filter(n => n !== user.name);
      if (rsvp) r[rsvp] = [...r[rsvp], user.name];
      return { ...p, my_rsvp: rsvp, rsvp: r };
    }));
    if (eventDetail?.id === id) {
      setEventDetail(prev => {
        const r = { yes: [...(prev.rsvp?.yes||[])], maybe: [...(prev.rsvp?.maybe||[])], no: [...(prev.rsvp?.no||[])] };
        if (prev.my_rsvp) r[prev.my_rsvp] = r[prev.my_rsvp].filter(n => n !== user.name);
        if (rsvp) r[rsvp] = [...r[rsvp], user.name];
        return { ...prev, my_rsvp: rsvp, rsvp: r };
      });
    }
  };

  const handleReport = (id) => {
    if (canModerate) {
      setDeleteConfirm(id);
    } else {
      await api.post(`/streets/${STREET_ID}/posts/${id}/report`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, reported: true } : p));
      setReportedToast(true);
      setTimeout(() => setReportedToast(false), 2500);
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
    await api.delete(`/streets/${STREET_ID}/posts/${id}`);
    setPosts(ps => ps.filter(p => p.id !== id));
  };

  const handleResolve = async (id, resolved) => {
    await api.patch(`/streets/${STREET_ID}/posts/${id}/resolve`, { resolved });
    setPosts(ps => ps.map(p => p.id === id ? { ...p, resolved } : p));
  };

  const handleNewPost = async (data) => {
    try {
      const post = await api.post(`/streets/${STREET_ID}/posts`, data);
      setPosts(ps => [post, ...ps]);
    } catch (e) {
      setPostError(e.message || 'Bericht plaatsen mislukt');
      setTimeout(() => setPostError(''), 4000);
    }
  };

  const handleEdit = async (postId, data) => {
    try {
      const updated = await api.patch(`/streets/${STREET_ID}/posts/${postId}`, data);
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, ...updated } : p));
    } catch (e) {
      setPostError(e.message || 'Bewerken mislukt');
      setTimeout(() => setPostError(''), 4000);
    }
  };

  const handleJoin = async (id) => {
    try {
      const { joined } = await api.post(`/streets/${STREET_ID}/posts/${id}/join`);
      const updatedPost = (p) => {
        if (p.id !== id) return p;
        const joiners = joined
          ? [...(p.joiners || []), user.name]
          : (p.joiners || []).filter(n => n !== user.name);
        return { ...p, my_join: joined, joiners };
      };
      setPosts(ps => ps.map(updatedPost));
      setJoinDetail(prev => prev?.id === id ? updatedPost(prev) : prev);
    } catch (e) {
      setPostError(e.message || 'Aanmelden mislukt');
      setTimeout(() => setPostError(''), 4000);
    }
  };

  const pinnedPosts = posts.filter(p => p.pinned);
  const regularPosts = posts.filter(p => !p.pinned);

  return (
    <div style={s.app}>
      {reportedToast && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: COLORS.surface, border: `1px solid ${COLORS.red}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, color: COLORS.text, zIndex: 200, whiteSpace: 'nowrap' }}>
          {t('reported_toast')}
        </div>
      )}
      {postError && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: COLORS.surface, border: `1px solid ${COLORS.red}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, color: COLORS.red, zIndex: 200, whiteSpace: 'nowrap' }}>
          {postError}
        </div>
      )}

      <div style={s.header}>
        <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
        <div style={s.streetBadge}>{streetInfo?.name || 'Reyer Anslostraat'}</div>
      </div>

      {tab === 'feed' && (
        <div style={{ ...s.feed, filter: (showPost || showCatPicker || showTypePicker || !!eventDetail || !!joinDetail || !!editPost) ? 'blur(4px)' : 'none', transition: 'filter 0.2s', pointerEvents: (showPost || showCatPicker || showTypePicker || !!eventDetail || !!joinDetail || !!editPost) ? 'none' : 'auto' }}>
          {notifSupported && !subscribed && permission !== 'denied' && (
            <div style={{ margin: '12px 12px 0', background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>Blijf op de hoogte</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>Ontvang een melding bij nieuwe berichten in de straat</div>
              </div>
              <button onClick={subscribe} style={{ background: COLORS.terracotta, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Aanzetten
              </button>
            </div>
          )}
          <SegmentedControl
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { key: 'all', label: t('all') },
              ...Object.entries(CATEGORIES).map(([key]) => ({ key, label: catLabel(key) })),
            ]}
          />
          {loading
            ? <div style={s.emptyState}>{t('loading')}</div>
            : <>
              {pinnedPosts.length > 0 && (
                <><div style={s.sectionLabel}>{t('pinned')}</div>
                {pinnedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} onResolve={handleResolve} />)}</>
              )}
              <div style={s.sectionLabel}>{t('recent')}</div>
              {regularPosts.length === 0
                ? <div style={s.emptyState}>{t('no_posts')}</div>
                : regularPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} onResolve={handleResolve} />)}
            </>
          }
        </div>
      )}

      {tab === 'streets' && <StreetsView user={user} />}
      {tab === 'admin' && (
        <AdminView streetId={STREET_ID} user={user}
          memberCount={streetInfo?.members || 0}
          households={streetInfo?.households || 0} />
      )}
      {tab === 'settings' && <SettingsView user={user} onLogout={logout} />}

      {tab === 'feed' && (
        <button style={s.fab} onClick={() => setShowCatPicker(true)}>Bericht plaatsen</button>
      )}

      <div style={s.tabBar}>
        {[
          { id: 'feed', label: t('feed'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
          ...(canModerate ? [
            { id: 'streets', label: t('streets'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            { id: 'admin', label: t('admin'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
          ] : []),
          { id: 'settings', label: t('settings'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
        ].map(tab_ => (
          <button key={tab_.id} style={s.tab(tab === tab_.id)} onClick={() => setTab(tab_.id)}>
            {tab_.svg(tab === tab_.id)}
            <span>{tab_.label}</span>
          </button>
        ))}
      </div>

      {showCatPicker && (
        <CategoryPickerSheet
          onClose={() => setShowCatPicker(false)}
          onSelect={(cat) => {
            setPendingCat(cat);
            setPendingType(null);
            setShowCatPicker(false);
            if (TYPE_META[cat]?.length) {
              setTimeout(() => setShowTypePicker(true), 270);
            } else {
              setTimeout(() => setShowPost(true), 270);
            }
          }}
        />
      )}
      {showTypePicker && (
        <TypePickerSheet
          cat={pendingCat}
          onClose={() => setShowTypePicker(false)}
          onSelect={(type) => { setPendingType(type); setShowTypePicker(false); setTimeout(() => setShowPost(true), 270); }}
        />
      )}
      {showPost && (
        <NewPostSheet onClose={() => setShowPost(false)} onSubmit={(data) => { handleNewPost(data); setShowPost(false); window.scrollTo({ top: 0, behavior: 'instant' }); }}
          streetId={STREET_ID} canPin={canPin} user={user} initialCat={pendingCat} initialType={pendingType} />
      )}
      {eventDetail && (
        <EventDetailSheet post={eventDetail} onClose={() => setEventDetail(null)} onRsvp={handleRsvp} />
      )}
      {joinDetail && (
        <JoinDetailSheet post={joinDetail} onClose={() => setJoinDetail(null)} onJoin={handleJoin} />
      )}
      {editPost && (
        <EditPostSheet post={editPost} onClose={() => setEditPost(null)} onSave={handleEdit} />
      )}
      {deleteConfirm && (
        <div style={s.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...s.sheet, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <div style={s.sheetTitle}>Bericht verwijderen?</div>
            <p style={{ fontSize: 15, color: COLORS.textDim, lineHeight: 1.5, marginBottom: 20 }}>
              Weet je zeker dat je dit bericht wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <button style={{ ...s.submitBtn, background: COLORS.red }} onClick={handleDeleteConfirmed}>
              Bericht verwijderen
            </button>
            <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
