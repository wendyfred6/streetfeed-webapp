import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.jsx';
import { usePush } from './hooks/usePush.jsx';
import { api } from './api/client.js';
import { t, getLang, setLang } from './i18n/index.js';

const COLORS = {
  bg: '#0F0F0F', surface: '#1A1A1A', border: '#2A2A2A',
  accent: '#E8FF47', text: '#F0F0F0', textMuted: '#888888', textDim: '#555555',
  pinned: '#1E2A00', pinnedBorder: '#4A6600',
  red: '#FF4444', blue: '#4488FF', orange: '#FF8833', purple: '#AA77FF', green: '#44BB44',
};

const CATEGORIES = {
  package:   { label: 'Pakketje',  labelEn: 'Package',   emoji: '📦', color: '#4488FF' },
  blockage:  { label: 'Blokkade',  labelEn: 'Blockage',  emoji: '🚧', color: '#FF8833', pinnable: true },
  waste:     { label: 'Grofvuil',  labelEn: 'Bulk waste',emoji: '🗑️', color: '#FF4444' },
  container: { label: 'Container', labelEn: 'Container', emoji: '🏗️', color: '#FF8833', pinnable: true },
  event:     { label: 'Evenement', labelEn: 'Event',     emoji: '🎉', color: '#AA77FF', pinnable: true, isEvent: true },
  incident:  { label: 'Melding',   labelEn: 'Incident',  emoji: '🚨', color: '#FF4444' },
  general:   { label: 'Algemeen',  labelEn: 'General',   emoji: '💬', color: '#888888' },
};

function catLabel(key) {
  const c = CATEGORIES[key];
  if (!c) return key;
  return getLang() === 'en' ? c.labelEn : c.label;
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const s = {
  app: { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: COLORS.bg, color: COLORS.text, minHeight: '100vh', maxWidth: 480, margin: '0 auto' },
  header: { background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 },
  logo: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' },
  accent: { color: COLORS.accent },
  streetBadge: { fontSize: 11, color: COLORS.textMuted, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '3px 8px' },
  feed: { padding: '0 0 100px 0' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textDim, padding: '16px 20px 8px' },
  card: (pinned) => ({ margin: '0 12px 8px', background: pinned ? COLORS.pinned : COLORS.surface, border: `1px solid ${pinned ? COLORS.pinnedBorder : COLORS.border}`, borderRadius: 12, padding: '14px 16px' }),
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 },
  cardBody: { fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 },
  cardMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardMetaLeft: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.textDim },
  pinnedBadge: { background: COLORS.accent, color: '#000', fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4 },
  endDateBadge: { fontSize: 10, color: COLORS.accent, background: 'rgba(232,255,71,0.1)', border: '1px solid rgba(232,255,71,0.2)', borderRadius: 4, padding: '2px 6px' },
  filterBar: { display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' },
  filterChip: (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, background: active ? COLORS.accent : COLORS.surface, color: active ? '#000' : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  fab: { position: 'fixed', bottom: 80, right: 20, width: 52, height: 52, borderRadius: '50%', background: COLORS.accent, color: '#000', fontSize: 24, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(232,255,71,0.4)', zIndex: 40, fontWeight: 700 },
  tabBar: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, display: 'flex', zIndex: 50 },
  tab: (active) => ({ flex: 1, padding: '12px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 400, color: active ? COLORS.accent : COLORS.textDim }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: COLORS.surface, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' },
  sheetHandle: { width: 36, height: 4, background: COLORS.border, borderRadius: 2, margin: '0 auto 20px' },
  sheetTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.3px' },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 },
  textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'none', height: 80, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textMuted, display: 'block', marginBottom: 6 },
  catGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  catOption: (selected, cat) => ({ background: selected ? `${CATEGORIES[cat]?.color}22` : COLORS.bg, border: `1px solid ${selected ? CATEGORIES[cat]?.color : COLORS.border}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400 }),
  submitBtn: { width: '100%', background: COLORS.accent, color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 8 },
  cancelBtn: { width: '100%', background: 'none', color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '12px', fontSize: 14, cursor: 'pointer', marginTop: 8 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '2px 6px' }),
  infoBox: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 },
  adminCard: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8 },
  statRow: { display: 'flex', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 800, color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  streetCard: { margin: '0 12px 8px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '16px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: COLORS.textDim, fontSize: 13 },
  actionBtn: { background: 'none', border: 'none', color: COLORS.textDim, fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 },
  reportBtn: { background: 'none', border: 'none', color: COLORS.textDim, fontSize: 11, cursor: 'pointer', padding: 0 },
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

function CatBadge({ cat }) {
  const c = CATEGORIES[cat];
  return (
    <span style={{ ...s.badge(c?.color || '#888'), textTransform: 'none', fontSize: 11 }}>
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

function RsvpBar({ post, onRsvp }) {
  const yes = post.rsvp?.yes || [];
  const maybe = post.rsvp?.maybe || [];
  const my = post.my_rsvp;
  const btn = (type, label, color) => (
    <button onClick={e => { e.stopPropagation(); onRsvp(post.id, type); }}
      style={{ flex: 1, background: my === type ? `${color}22` : COLORS.bg, border: `1px solid ${my === type ? color : COLORS.border}`, borderRadius: 8, padding: '7px 4px', color: my === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: my === type ? 700 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  );
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...s.infoBox, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{post.event_date} {post.event_time}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>{post.event_location}</div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        <span style={{ color: COLORS.text, fontWeight: 700 }}>{yes.length}</span> komen
        {maybe.length > 0 && <> · <span style={{ color: COLORS.text, fontWeight: 700 }}>{maybe.length}</span> misschien</>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {btn('yes', t('rsvp_yes'), COLORS.green)}
        {btn('maybe', t('rsvp_maybe'), COLORS.orange)}
        {btn('no', t('rsvp_no'), COLORS.red)}
      </div>
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
        <div style={{ background: `${COLORS.blue}11`, border: `1px solid ${COLORS.blue}44`, borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
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

function IncidentExtra({ post }) {
  return (
    <div style={{ marginTop: 10 }}>
      {post.license_plate && (
        <div style={{ ...s.infoBox, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Kenteken</span>
          <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, background: '#FFD700', color: '#000', padding: '2px 10px', borderRadius: 4, letterSpacing: '2px' }}>{post.license_plate}</span>
        </div>
      )}
      {post.photo_key && (
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          Foto bijgevoegd · <span style={{ color: COLORS.accent }}>Bekijk foto</span>
        </div>
      )}
      <a href="https://www.politie.nl/aangifte-of-melding-doen" target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', background: 'none', border: `1px solid ${COLORS.red}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: COLORS.red, textDecoration: 'none', textAlign: 'center' }}>
        {t('police_report')}
      </a>
    </div>
  );
}

// ─── CARRIER BADGE ─────────────────────────────────────────────────────────────

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

function PostCard({ post, onLike, onRsvp, onOpenEvent, onReport, onOpenJoin, canModerate, onEdit, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const isEvent = post.category === 'event';
  const isIncident = post.category === 'incident';
  const isPackage = post.category === 'package';

  // FRE-265: datum-badge logica
  const getDateLabel = () => {
    if (isEvent && post.event_date) return post.event_date;
    if (['blockage', 'container'].includes(post.category)) {
      const fmt = (d) => {
        const [y, m, day] = d.substring(0, 10).split('-');
        return new Date(+y, +m - 1, +day).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      };
      if (post.start_date && post.end_date) return `${fmt(post.start_date)} – ${fmt(post.end_date)}`;
      if (post.end_date) return `t/m ${fmt(post.end_date)}`;
    }
    return null;
  };
  const dateLabel = getDateLabel();

  const firstName = (post.author_name || '').split(' ')[0] || 'Bewoner';

  return (
    <div style={s.card(post.pinned)}>
      {/* ── Klikbare header (altijd zichtbaar) ── */}
      <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <CatBadge cat={post.category} />
          {/* Event-datum: badge; blokkade/container datum: plain tekst */}
          {dateLabel && (
            isEvent
              ? <span style={s.endDateBadge}>{dateLabel}</span>
              : <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 500 }}>{dateLabel}</span>
          )}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ flexShrink: 0, marginLeft: 'auto', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke={COLORS.textMuted} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={s.cardTitle}>{post.title}</div>
      </div>

      {/* ── Uitgeklapte inhoud — alles links uitgelijnd, geen padding-offset ── */}
      {expanded && (
        <div style={{ marginTop: 8 }}>
          {post.body && <div style={s.cardBody}>{post.body}</div>}
          {isEvent && post.rsvp && <RsvpBar post={post} onRsvp={onRsvp} />}
          {isIncident && <IncidentExtra post={post} />}
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
          {/* Link: geen emoji, gewoon de URL */}
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
          {isEvent && (
            <button onClick={e => { e.stopPropagation(); onOpenEvent(post); }}
              style={{ marginTop: 10, width: '100%', background: 'none', border: `1px solid ${COLORS.purple}44`, borderRadius: 8, padding: '8px 12px', color: COLORS.purple, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}>
              {t('tap_details')} →
            </button>
          )}
          {/* Meta-rij: voornaam, tijd, acties */}
          <div style={{ ...s.cardMeta, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={s.cardMetaLeft}>
              <span style={{ fontSize: 10, fontWeight: 600, color: post.author_role === 'admin' ? COLORS.accent : post.author_role === 'moderator' ? COLORS.purple : COLORS.textDim }}>
                {firstName}{post.author_role === 'admin' ? ' · Admin' : post.author_role === 'moderator' ? ' · Mod' : ''}
              </span>
              <span>·</span><span>{timeAgo(post.created_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Like — hartje SVG + teller */}
              <button style={{ ...s.actionBtn, gap: 5, color: post.liked ? COLORS.red : COLORS.textDim }} onClick={e => { e.stopPropagation(); onLike(post.id); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span>{post.likes}</span>
              </button>
              {/* Edit — potlood SVG */}
              {canEdit && (
                <button style={{ ...s.actionBtn, color: COLORS.textDim }} onClick={e => { e.stopPropagation(); onEdit(post); }} title="Bewerken">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
              {/* Delete / Report — prullenbak of tekst */}
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

// ─── EVENT DETAIL SHEET ────────────────────────────────────────────────────────

function EventDetailSheet({ post, onClose, onRsvp }) {
  const yes = post.rsvp?.yes || [];
  const maybe = post.rsvp?.maybe || [];
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={s.badge(COLORS.purple)}>Evenement</span>
          {post.pinned && <span style={s.pinnedBadge}>Pinned</span>}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{post.title}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>{post.body}</div>
        <div style={{ ...s.infoBox, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>{post.event_date} om {post.event_time}</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>{post.event_location}</div>
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
        <button style={s.cancelBtn} onClick={onClose}>{t('close')}</button>
      </div>
    </div>
  );
}

// ─── CALENDAR HELPERS ──────────────────────────────────────────────────────────

const DUTCH_MONTHS = { 'januari':0,'februari':1,'maart':2,'april':3,'mei':4,'juni':5,'juli':6,'augustus':7,'september':8,'oktober':9,'november':10,'december':11 };

function parseDutchDate(dateStr, timeStr = '00:00') {
  const p = (dateStr || '').trim().split(' ');
  if (p.length < 3) return null;
  const month = DUTCH_MONTHS[p[1]?.toLowerCase()];
  if (month === undefined) return null;
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return new Date(parseInt(p[2]), month, parseInt(p[0]), h || 0, m || 0);
}

function toICSDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function downloadICS(post) {
  const start = parseDutchDate(post.event_date, post.event_time);
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
  const start = parseDutchDate(post.event_date, post.event_time);
  if (!start) return '#';
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(post.body||'')}&location=${encodeURIComponent(post.event_location||'')}`;
}

// ─── JOIN DETAIL SHEET ─────────────────────────────────────────────────────────

function JoinDetailSheet({ post, onClose, onJoin }) {
  const joiners = post.joiners || [];
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
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
        <button style={s.cancelBtn} onClick={onClose}>{t('close')}</button>
      </div>
    </div>
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

  const isEvent = post.category === 'event';
  const isPackage = post.category === 'package';
  const hasDateRange = ['blockage', 'container'].includes(post.category);
  const hasLink = ['blockage', 'container', 'waste'].includes(post.category);

  return (
    <div style={s.overlay}>
      <div style={s.sheet}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={s.sheetTitle}>Bericht bewerken</div>
          <CatBadge cat={post.category} />
        </div>

        <label style={s.label}>{t('title')}</label>
        <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} />

        <label style={s.label}>{t('message')}</label>
        <textarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} />

        {hasDateRange && (
          <>
            <label style={s.label}>Startdatum (optioneel)</label>
            <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <label style={s.label}>Einddatum (optioneel)</label>
            <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </>
        )}

        {isEvent && (
          <>
            <label style={s.label}>{t('event_date')}</label>
            <input style={s.input} value={eventDate} onChange={e => setEventDate(e.target.value)} />
            <label style={s.label}>{t('event_time')}</label>
            <input style={s.input} value={eventTime} onChange={e => setEventTime(e.target.value)} />
            <label style={s.label}>{t('event_location')}</label>
            <input style={s.input} value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
          </>
        )}

        {isPackage && (
          <>
            <label style={s.label}>Bezorger</label>
            <select value={carrier} onChange={e => setCarrier(e.target.value)}
              style={{ ...s.input, cursor: 'pointer', marginBottom: 10, paddingRight: 32 }}>
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
            eventDate: eventDate || undefined,
            eventTime: eventTime || undefined,
            eventLocation: eventLocation || undefined,
            carrier: carrier || undefined,
            link: link || undefined,
          });
          onClose();
        }}>
          Opslaan
        </button>
        <button style={s.cancelBtn} onClick={onClose}>{t('cancel')}</button>
      </div>
    </div>
  );
}

// ─── PHOTO UPLOAD ──────────────────────────────────────────────────────────────

function PhotoUpload({ category, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload mislukt');
      const { key } = await res.json();
      onUploaded(key);
    } catch (e) {
      console.error('Upload failed', e);
    }
    setUploading(false);
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ ...s.label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: COLORS.textMuted }}>
          {uploading ? 'Uploaden...' : t('photo')}
        </span>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
      {preview && <img src={preview} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 6, objectFit: 'cover', maxHeight: 160 }} />}
    </div>
  );
}

// ─── NEW POST SHEET ────────────────────────────────────────────────────────────

function NewPostSheet({ onClose, onSubmit, streetId, canPin, user }) {
  const [cat, setCat] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Pakketje: huisnummers voor auto-gegenereerde titel
  const [forHouse, setForHouse] = useState('');
  const [pickupHouse, setPickupHouse] = useState(user?.house_number || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [bringItems, setBringItems] = useState('');
  const [licenseplate, setLicenseplate] = useState('');
  const [photoKey, setPhotoKey] = useState(null);
  const [link, setLink] = useState('');
  const [carrier, setCarrier] = useState('');
  const [attachmentName, setAttachmentName] = useState(null);
  const [allowJoin, setAllowJoin] = useState(false);

  const isEvent = cat === 'event';
  const isIncident = cat === 'incident';
  const isPinnable = CATEGORIES[cat]?.pinnable;
  const hasLink = ['blockage', 'container', 'waste'].includes(cat);
  const isPackage = cat === 'package';
  const isGeneral = cat === 'general';

  // Auto-gegenereerde titel voor pakketje
  const packageTitle = `Pakket voor ${forHouse.trim() || '—'} → Ophalen bij nr. ${pickupHouse.trim() || '—'}`;

  // Submit mag pas als verplichte velden ingevuld zijn
  const canSubmit = isPackage
    ? (forHouse.trim() && pickupHouse.trim())
    : title.trim();

  return (
    <div style={s.overlay}>
      <div style={s.sheet}>
        <div style={s.sheetHandle} />
        <div style={s.sheetTitle}>{t('new_post')}</div>
        <label style={s.label}>{t('category')}</label>
        <div style={s.catGrid}>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <div key={key} style={s.catOption(cat === key, key)} onClick={() => setCat(key)}>
              {catLabel(key)}
            </div>
          ))}
        </div>

        {/* Pakketje: huisnummerpicker i.p.v. vrije titel */}
        {isPackage ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Pakket voor nr.</label>
                <input style={s.input} placeholder="bijv. 27-2"
                  value={forHouse} onChange={e => setForHouse(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Ophalen bij nr.</label>
                <input style={s.input} placeholder="bijv. 28-2"
                  value={pickupHouse} onChange={e => setPickupHouse(e.target.value)} />
              </div>
            </div>
            {(forHouse || pickupHouse) && (
              <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>
                Titel: <strong style={{ color: COLORS.text }}>{packageTitle}</strong>
              </div>
            )}
            <label style={s.label}>Extra details (optioneel)</label>
            <textarea style={{ ...s.textarea, height: 60 }} placeholder="Bijv. staat bij de voordeur, is al geopend..."
              value={body} onChange={e => setBody(e.target.value)} />
          </>
        ) : (
          <>
            <label style={s.label}>{t('title')}</label>
            <input style={s.input} placeholder={t('title_placeholder')} value={title} onChange={e => setTitle(e.target.value)} />
            <label style={s.label}>{t('message')}</label>
            <textarea style={s.textarea} placeholder={t('message_placeholder')} value={body} onChange={e => setBody(e.target.value)} />
          </>
        )}
        <PhotoUpload category={cat} onUploaded={setPhotoKey} />
        <div style={{ marginBottom: 10 }}>
          <label style={{ ...s.label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: attachmentName ? COLORS.accent : COLORS.textMuted }}>
              {attachmentName ? attachmentName : 'Document toevoegen (PDF)'}
            </span>
            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={e => setAttachmentName(e.target.files[0]?.name || null)} />
          </label>
        </div>
        {isPackage && (
          <>
            <label style={s.label}>Bezorger</label>
            <select value={carrier} onChange={e => setCarrier(e.target.value)}
              style={{ ...s.input, cursor: 'pointer', marginBottom: 10, paddingRight: 32 }}>
              <option value="">Selecteer bezorger (optioneel)</option>
              {['PostNL','DHL','DPD','GLS','Bol.com','Coolblue','Amazon','Anders'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        {isGeneral && (
          <div onClick={() => setAllowJoin(v => !v)}
            style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 10 }}>
            <span style={{ fontSize: 13 }}>Aanmeldknop toevoegen</span>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: allowJoin ? COLORS.accent : COLORS.border, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: allowJoin ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: allowJoin ? '#000' : COLORS.textDim, transition: 'left 0.2s' }} />
            </div>
          </div>
        )}
        {hasLink && (
          <>
            <label style={s.label}>Externe link (optioneel)</label>
            <input style={s.input} placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
          </>
        )}
        {isIncident && (
          <>
            <label style={s.label}>{t('license_plate')}</label>
            <input style={{ ...s.input, fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
              placeholder={t('license_plate_placeholder')} value={licenseplate}
              onChange={e => setLicenseplate(e.target.value.toUpperCase())} />
            <RdwLookup kenteken={licenseplate} />
          </>
        )}
        {isEvent && (
          <>
            <label style={s.label}>{t('event_date')}</label>
            <input style={s.input} placeholder={t('event_date_placeholder')} value={eventDate} onChange={e => setEventDate(e.target.value)} />
            <label style={s.label}>{t('event_time')}</label>
            <input style={s.input} placeholder={t('event_time_placeholder')} value={eventTime} onChange={e => setEventTime(e.target.value)} />
            <label style={s.label}>{t('event_location')}</label>
            <input style={s.input} placeholder={t('event_location_placeholder')} value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
            <label style={s.label}>{t('bring_list')}</label>
            <input style={s.input} placeholder={t('bring_list_placeholder')} value={bringItems} onChange={e => setBringItems(e.target.value)} />
          </>
        )}
        {/* Start + einddatum voor blokkade/container */}
        {['blockage', 'container'].includes(cat) && (
          <>
            <label style={s.label}>Startdatum (optioneel)</label>
            <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <label style={s.label}>Einddatum (optioneel)</label>
            <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            {/* Auto-pin hint: wordt vastgepind als admin en einddatum is ingevuld */}
            {canPin && endDate && (
              <div style={{ fontSize: 11, color: COLORS.accent, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                Dit bericht wordt automatisch vastgepind t/m de einddatum.
              </div>
            )}
          </>
        )}
        {cat === 'event' && canPin && (
          <>
            <label style={s.label}>{t('end_date')}</label>
            <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </>
        )}
        <button style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.5 }}
          disabled={!canSubmit}
          onClick={() => {
            if (!canSubmit) return;
            const finalTitle = isPackage ? packageTitle : title;
            onSubmit({ category: cat, title: finalTitle, body,
              startDate: startDate || undefined,
              endDate, eventDate, eventTime, eventLocation,
              bringList: bringItems ? bringItems.split(',').map(i => i.trim()) : [],
              licensePlate: licenseplate || undefined, photoKey: photoKey || undefined,
              link: link || undefined, carrier: carrier || undefined,
              attachmentName: attachmentName || undefined, allowJoin,
              pinned: canPin && isPinnable && !!endDate });
            onClose();
          }}>{t('publish')}</button>
        <button style={s.cancelBtn} onClick={onClose}>{t('cancel')}</button>
      </div>
    </div>
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
          <div key={id} style={{ ...s.filterChip(subTab === id), borderRadius: 8 }} onClick={() => setSubTab(id)}>{label}</div>
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
        {!subscribed && permission !== 'denied' && (
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
            {st.role === 'admin' && <span style={s.badge(COLORS.accent)}>Admin</span>}
            {st.role === 'moderator' && <span style={s.badge(COLORS.purple)}>Mod</span>}
            <span style={s.badge(COLORS.blue)}>LID</span>
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

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const { user, logout } = useAuth();
  const { permission, subscribed, subscribe } = usePush();
  const [tab, setTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [joinDetail, setJoinDetail] = useState(null);
  const [reportedToast, setReportedToast] = useState(false);
  const [postError, setPostError] = useState('');
  const [streetInfo, setStreetInfo] = useState(null);
  const [editPost, setEditPost] = useState(null);

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
    if (tab === 'feed') loadPosts();
  }, [tab, loadPosts]);

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

  const handleReport = async (id) => {
    if (canModerate) {
      await api.delete(`/streets/${STREET_ID}/posts/${id}`);
      setPosts(ps => ps.filter(p => p.id !== id));
    } else {
      await api.post(`/streets/${STREET_ID}/posts/${id}/report`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, reported: true } : p));
      setReportedToast(true);
      setTimeout(() => setReportedToast(false), 2500);
    }
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
    const { joined } = await api.post(`/streets/${STREET_ID}/posts/${id}/join`);
    const update = (p) => {
      if (p.id !== id) return p;
      const joiners = joined
        ? [...(p.joiners || []), user.name]
        : (p.joiners || []).filter(n => n !== user.name);
      return { ...p, my_join: joined, joiners };
    };
    setPosts(ps => ps.map(update));
    if (joinDetail?.id === id) setJoinDetail(update);
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
        <div style={s.feed}>
          {!subscribed && permission !== 'denied' && (
            <div style={{ margin: '12px 12px 0', background: 'rgba(232,255,71,0.06)', border: '1px solid rgba(232,255,71,0.25)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>Blijf op de hoogte</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>Ontvang een melding bij nieuwe berichten in de straat</div>
              </div>
              <button onClick={subscribe} style={{ background: COLORS.accent, color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Aanzetten
              </button>
            </div>
          )}
          <div style={s.filterBar}>
            <div style={s.filterChip(filter === 'all')} onClick={() => setFilter('all')}>{t('all')}</div>
            {Object.entries(CATEGORIES).map(([key]) => (
              <div key={key} style={s.filterChip(filter === key)} onClick={() => setFilter(key)}>{catLabel(key)}</div>
            ))}
          </div>
          {loading
            ? <div style={s.emptyState}>{t('loading')}</div>
            : <>
              {pinnedPosts.length > 0 && (
                <><div style={s.sectionLabel}>{t('pinned')}</div>
                {pinnedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} />)}</>
              )}
              <div style={s.sectionLabel}>{t('recent')}</div>
              {regularPosts.length === 0
                ? <div style={s.emptyState}>{t('no_posts')}</div>
                : regularPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} />)}
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

      {tab === 'feed' && <button style={s.fab} onClick={() => setShowPost(true)}>+</button>}

      <div style={s.tabBar}>
        {[
          { id: 'feed', label: t('feed'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
          { id: 'streets', label: t('streets'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
          ...(canModerate ? [{ id: 'admin', label: t('admin'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }] : []),
          { id: 'settings', label: t('settings'), svg: (a) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
        ].map(tab_ => (
          <button key={tab_.id} style={s.tab(tab === tab_.id)} onClick={() => setTab(tab_.id)}>
            {tab_.svg(tab === tab_.id)}
            <span>{tab_.label}</span>
          </button>
        ))}
      </div>

      {showPost && (
        <NewPostSheet onClose={() => setShowPost(false)} onSubmit={(data) => { handleNewPost(data); setShowPost(false); }}
          streetId={STREET_ID} canPin={canPin} user={user} />
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
    </div>
  );
}
