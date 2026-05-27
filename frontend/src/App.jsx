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
  filterChip: (active) => ({ background: active ? COLORS.accent : COLORS.surface, color: active ? '#000' : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
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
  if (diff < 60) return 'zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  if (diff < 172800) return 'gisteren';
  return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function CatBadge({ cat }) {
  const c = CATEGORIES[cat];
  return (
    <span style={{ ...s.badge(c?.color || '#888'), textTransform: 'none', fontSize: 11 }}>
      {c?.emoji} {catLabel(cat)}
    </span>
  );
}

function RoleBadge({ role }) {
  const map = { admin: [COLORS.accent, '👑 Admin'], moderator: [COLORS.purple, '🛡️ Mod'], resident: [COLORS.textDim, 'Bewoner'] };
  const [color, label] = map[role] || [COLORS.textDim, role];
  return <span style={s.badge(color)}>{label}</span>;
}

// ─── RSVP BAR ──────────────────────────────────────────────────────────────────

function RsvpBar({ post, onRsvp }) {
  const yes = post.rsvp?.yes || [];
  const maybe = post.rsvp?.maybe || [];
  const my = post.my_rsvp;
  const btn = (type, emoji, label, color) => (
    <button onClick={e => { e.stopPropagation(); onRsvp(post.id, type); }}
      style={{ flex: 1, background: my === type ? `${color}22` : COLORS.bg, border: `1px solid ${my === type ? color : COLORS.border}`, borderRadius: 8, padding: '7px 4px', color: my === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: my === type ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span><span>{label}</span>
    </button>
  );
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...s.infoBox, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}><span style={{ color: COLORS.purple }}>📅</span> {post.event_date} {post.event_time}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}><span style={{ color: COLORS.purple }}>📍</span> {post.event_location}</div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        <span style={{ color: COLORS.text, fontWeight: 700 }}>{yes.length}</span> komen
        {maybe.length > 0 && <> · <span style={{ color: COLORS.text, fontWeight: 700 }}>{maybe.length}</span> misschien</>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {btn('yes', '✅', t('rsvp_yes'), COLORS.green)}
        {btn('maybe', '🤔', t('rsvp_maybe'), COLORS.orange)}
        {btn('no', '❌', t('rsvp_no'), COLORS.red)}
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
          📷 Foto bijgevoegd · <span style={{ color: COLORS.accent }}>Bekijk foto</span>
        </div>
      )}
      <a href="https://www.politie.nl/aangifte-of-melding-doen" target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', background: 'none', border: `1px solid ${COLORS.red}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: COLORS.red, textDecoration: 'none', textAlign: 'center' }}>
        {t('police_report')}
      </a>
    </div>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onRsvp, onOpenEvent, onReport, canModerate }) {
  const cat = CATEGORIES[post.category];
  const isEvent = post.category === 'event';
  const isIncident = post.category === 'incident';

  return (
    <div style={s.card(post.pinned)} onClick={isEvent ? () => onOpenEvent(post) : undefined}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat?.color || '#888', marginTop: 6, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            {post.pinned && <span style={s.pinnedBadge}>📌 Pinned</span>}
            {post.end_date && <span style={s.endDateBadge}>t/m {new Date(post.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
            <CatBadge cat={post.category} />
          </div>
          <div style={s.cardTitle}>{post.title}</div>
          <div style={s.cardBody}>{post.body}</div>
          {isEvent && post.rsvp && <RsvpBar post={post} onRsvp={onRsvp} />}
          {isIncident && <IncidentExtra post={post} />}
        </div>
      </div>
      <div style={s.cardMeta}>
        <div style={s.cardMetaLeft}>
          <span style={{ fontSize: 10, fontWeight: 600, color: post.author_role === 'admin' ? COLORS.accent : post.author_role === 'moderator' ? COLORS.purple : COLORS.textDim }}>
            {post.author_role === 'admin' ? '👑 ' : post.author_role === 'moderator' ? '🛡️ ' : ''}{post.author_name}
          </span>
          <span>·</span><span>{timeAgo(post.created_at)}</span>
          {isEvent && <span style={{ color: COLORS.purple, fontSize: 11 }}>{t('tap_details')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button style={{ ...s.actionBtn, color: post.liked ? COLORS.red : COLORS.textDim }} onClick={e => { e.stopPropagation(); onLike(post.id); }}>♥ {post.likes}</button>
          <button style={s.actionBtn} onClick={e => e.stopPropagation()}>💬 {post.comments}</button>
          {canModerate ? (
            <button style={{ ...s.reportBtn, color: COLORS.red }} onClick={e => { e.stopPropagation(); onReport(post.id); }} title={t('delete')}>🗑</button>
          ) : (
            <button style={{ ...s.reportBtn, color: post.reported ? COLORS.red : COLORS.textDim }} onClick={e => { e.stopPropagation(); onReport(post.id); }} title={t('report')}>
              {post.reported ? '🚩' : '⚑'}
            </button>
          )}
        </div>
      </div>
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
          <span style={s.badge(COLORS.purple)}>🎉 EVENEMENT</span>
          {post.pinned && <span style={s.pinnedBadge}>📌 Pinned</span>}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{post.title}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>{post.body}</div>
        <div style={{ ...s.infoBox, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>📅</span> {post.event_date} om {post.event_time}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>📍</span> {post.event_location}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>👥</span> <strong>{yes.length}</strong> komen · <strong>{maybe.length}</strong> misschien</div>
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
          {[['yes','✅',t('rsvp_yes'),COLORS.green],['maybe','🤔',t('rsvp_maybe'),COLORS.orange],['no','❌',t('rsvp_no'),COLORS.red]].map(([type,emoji,label,color]) => (
            <button key={type} onClick={() => onRsvp(post.id, type)}
              style={{ flex: 1, background: post.my_rsvp === type ? `${color}22` : COLORS.bg, border: `1px solid ${post.my_rsvp === type ? color : COLORS.border}`, borderRadius: 8, padding: '10px 4px', color: post.my_rsvp === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: post.my_rsvp === type ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span><span>{label}</span>
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
        <button style={s.cancelBtn} onClick={onClose}>{t('close')}</button>
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
      const { url, key } = await api.post('/upload/presign', {
        category,
        contentType: file.type,
      });
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
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
          {uploading ? '⏳ Uploaden...' : `📷 ${t('photo')}`}
        </span>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
      {preview && <img src={preview} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 6, objectFit: 'cover', maxHeight: 160 }} />}
    </div>
  );
}

// ─── NEW POST SHEET ────────────────────────────────────────────────────────────

function NewPostSheet({ onClose, onSubmit, streetId, canPin }) {
  const [cat, setCat] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [bringItems, setBringItems] = useState('');
  const [licenseplate, setLicenseplate] = useState('');
  const [photoKey, setPhotoKey] = useState(null);

  const isEvent = cat === 'event';
  const isIncident = cat === 'incident';
  const isPinnable = CATEGORIES[cat]?.pinnable;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.sheetHandle} />
        <div style={s.sheetTitle}>{t('new_post')}</div>
        <label style={s.label}>{t('category')}</label>
        <div style={s.catGrid}>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <div key={key} style={s.catOption(cat === key, key)} onClick={() => setCat(key)}>
              <span style={{ fontSize: 16 }}>{c.emoji}</span><span>{catLabel(key)}</span>
            </div>
          ))}
        </div>
        <label style={s.label}>{t('title')}</label>
        <input style={s.input} placeholder={t('title_placeholder')} value={title} onChange={e => setTitle(e.target.value)} />
        <label style={s.label}>{t('message')}</label>
        <textarea style={s.textarea} placeholder={t('message_placeholder')} value={body} onChange={e => setBody(e.target.value)} />
        <PhotoUpload category={cat} onUploaded={setPhotoKey} />
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
        {isPinnable && canPin && (
          <>
            <label style={s.label}>{t('end_date')}</label>
            <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </>
        )}
        <button style={s.submitBtn} onClick={() => {
          if (!title.trim()) return;
          onSubmit({ category: cat, title, body, endDate, eventDate, eventTime, eventLocation,
            bringList: bringItems ? bringItems.split(',').map(i => i.trim()) : [],
            licensePlate: licenseplate || undefined, photoKey: photoKey || undefined,
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
                <option value="resident">👤 Bewoner</option>
                <option value="moderator">🛡️ Moderator</option>
                <option value="admin">🔑 Admin</option>
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
            <span style={{ fontSize: 13 }}>{c.emoji} {catLabel(key)}</span>
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
            {[['nl', '🇳🇱 Nederlands'], ['en', '🇬🇧 English']].map(([code, label]) => (
              <div key={code} onClick={() => switchLang(code)} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: lang === code ? 700 : 400, background: lang === code ? COLORS.accent : 'none', color: lang === code ? '#000' : COLORS.textMuted, cursor: 'pointer' }}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.sectionLabel}>{t('privacy_title')}</div>
      <div style={{ padding: '0 12px' }}>
        <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Zo gaan we om met jouw data:</div>
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
            <span>🏠 {st.households} {t('households')}</span>
            <span>👥 {st.members} {t('members')}</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            {st.role === 'admin' && <span style={s.badge(COLORS.accent)}>👑 ADMIN</span>}
            {st.role === 'moderator' && <span style={s.badge(COLORS.purple)}>🛡️ MOD</span>}
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t('pending_title')}</div>
        <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>{t('pending_body')}</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [reportedToast, setReportedToast] = useState(false);
  const [streetInfo, setStreetInfo] = useState(null);

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
    const post = await api.post(`/streets/${STREET_ID}/posts`, data);
    setPosts(ps => [post, ...ps]);
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

      <div style={s.header}>
        <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
        <div style={s.streetBadge}>📍 {streetInfo?.name || 'Reyer Anslostraat'}</div>
      </div>

      {tab === 'feed' && (
        <div style={s.feed}>
          <div style={s.filterBar}>
            <div style={s.filterChip(filter === 'all')} onClick={() => setFilter('all')}>{t('all')}</div>
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <div key={key} style={s.filterChip(filter === key)} onClick={() => setFilter(key)}>{c.emoji} {catLabel(key)}</div>
            ))}
          </div>
          {loading
            ? <div style={s.emptyState}>{t('loading')}</div>
            : <>
              {pinnedPosts.length > 0 && filter === 'all' && (
                <><div style={s.sectionLabel}>{t('pinned')}</div>
                {pinnedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} canModerate={canModerate} />)}</>
              )}
              <div style={s.sectionLabel}>{t('recent')}</div>
              {regularPosts.length === 0
                ? <div style={s.emptyState}>{t('no_posts')}</div>
                : regularPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} canModerate={canModerate} />)}
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
          { id: 'feed', icon: '🏠', label: t('feed') },
          { id: 'streets', icon: '🗺️', label: t('streets') },
          ...(canModerate ? [{ id: 'admin', icon: '👑', label: t('admin') }] : []),
          { id: 'settings', icon: '⚙️', label: t('settings') },
        ].map(tab_ => (
          <button key={tab_.id} style={s.tab(tab === tab_.id)} onClick={() => setTab(tab_.id)}>
            <span style={{ fontSize: 18 }}>{tab_.icon}</span>
            <span>{tab_.label}</span>
          </button>
        ))}
      </div>

      {showPost && (
        <NewPostSheet onClose={() => setShowPost(false)} onSubmit={handleNewPost}
          streetId={STREET_ID} canPin={canPin} />
      )}
      {eventDetail && (
        <EventDetailSheet post={eventDetail} onClose={() => setEventDetail(null)} onRsvp={handleRsvp} />
      )}
    </div>
  );
}
