import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useAuth } from './hooks/useAuth.jsx';
import { usePush, notifSupported } from './hooks/usePush.jsx';
import { useToast } from './hooks/useToast.jsx';
import { api } from './api/client.js';
import { t, getLang, setLang } from './i18n/index.js';

import { COLORS, RADIUS, ALPHA, GLASS } from './design/tokens.js';
import HouseNumberPicker from './components/HouseNumberPicker.jsx';
import AutoTextarea from './components/AutoTextarea.jsx';
import PostCard from './components/PostCard.jsx';
import Toast from './components/Toast.jsx';
import { CATEGORIES, catLabel, CATEGORY_TREE, typeLabel } from './utils/categories.js';
import { timeAgo } from './utils/time.js';
import { formatEventDate, downloadICS, googleCalendarUrl } from './utils/eventDate.js';

// Phosphor Icons — subpath imports per icoon i.p.v. de barrel, voor kleinere bundle
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { UserIcon } from '@phosphor-icons/react/dist/csr/User';
import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { CraneTowerIcon } from '@phosphor-icons/react/dist/csr/CraneTower';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { ArrowCircleLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowCircleLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';

// ─── STYLES ────────────────────────────────────────────────────────────────────

const s = {
  app: { fontFamily: "'Inter','Helvetica Neue',sans-serif", background: 'transparent', color: COLORS.text, minHeight: '100vh', maxWidth: 390, margin: '0 auto' },
  header: { ...GLASS.header, borderBottom: '1px solid rgba(255,255,255,0.3)', padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 },
  logo: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' },
  accent: { color: COLORS.accent },
  headerActions: { display: 'flex', alignItems: 'center', gap: 4 },
  headerIconBtn: (active) => ({ width: 36, height: 36, background: active ? ALPHA.accentSubtle : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: RADIUS.pill, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? COLORS.accent : COLORS.textMuted }),
  feed: { padding: '0 0 calc(98px + env(safe-area-inset-bottom)) 0' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textMuted, padding: '16px 20px 8px' },
  cardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 },
  pinnedBadge: { background: COLORS.accent, color: COLORS.textInverse, fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: RADIUS.xs },
  endDateBadge: { fontSize: 10, color: COLORS.accent, background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.xs, padding: '2px 6px' },
  filterBar: { display: 'flex', gap: 6, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' },
  filterChip: (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, background: active ? COLORS.accent : 'rgba(255,255,255,0.55)', color: active ? COLORS.textInverse : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '5px 12px', fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  bottomBar: { position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 28px)', maxWidth: 374, display: 'flex', alignItems: 'center', zIndex: 50 },
  tabBar: { ...GLASS.header, border: '1px solid rgba(255,255,255,0.55)', borderRadius: RADIUS.pill, padding: '5px', display: 'flex', flex: '1 1 auto' },
  tab: (active) => ({ flex: 1, padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? ALPHA.accentSubtle : 'none', border: 'none', borderRadius: RADIUS.pill, cursor: 'pointer', color: active ? COLORS.accent : COLORS.textMuted, transition: 'background 0.15s' }),
  postCta: (visible) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: visible ? 54 : 0, height: 54, marginLeft: visible ? 10 : 0,
    background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill,
    cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
    opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.4)',
    boxShadow: visible ? `0 4px 20px ${ALPHA.terraGlow}` : 'none',
    transition: 'width 0.28s ease, margin-left 0.28s ease, opacity 0.18s ease, transform 0.28s ease, box-shadow 0.28s ease',
    pointerEvents: visible ? 'auto' : 'none',
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,10,18,0.50)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { ...GLASS.sheet, borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto', touchAction: 'pan-y', overscrollBehaviorX: 'none' },
  sheetHandle: { width: 36, height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 2, margin: '0 auto 20px' },
  sheetTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.3px' },
  sheetBackRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  sheetBackBtn: { background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: RADIUS.pill, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.text, flexShrink: 0 },
  input: { width: '100%', ...GLASS.input, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 10 },
  textarea: { width: '100%', ...GLASS.input, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', resize: 'none', minHeight: 80, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textDim, display: 'block', marginBottom: 6 },
  catGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  catOption: (selected, cat) => ({ background: selected ? `${CATEGORIES[cat]?.color}18` : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${selected ? CATEGORIES[cat]?.color : 'rgba(255,255,255,0.60)'}`, borderRadius: RADIUS.pill, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400, whiteSpace: 'nowrap' }),
  submitBtn: { width: '100%', background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  cancelBtn: { width: '100%', background: 'rgba(255,255,255,0.60)', color: COLORS.text, border: `2px solid ${COLORS.borderPrimary}`, borderRadius: RADIUS.pill, padding: '11px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 11, fontWeight: 700, padding: '2px 7px' }),
  infoBox: { ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 10 },
  adminCard: { ...GLASS.card, borderRadius: RADIUS.lg, padding: '14px 16px', marginBottom: 8 },
  statRow: { display: 'flex', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, ...GLASS.card, borderRadius: RADIUS.lg, padding: '12px', textAlign: 'center' },
  statNum: { fontSize: 24, fontWeight: 800, color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  streetCard: { margin: '0 12px 8px', ...GLASS.card, borderRadius: RADIUS.lg, padding: '16px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: 15 },
  reportBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 12, cursor: 'pointer', padding: 0 },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────

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

// ─── CATEGORY PICKER (gecentreerde modal, alle niveaus intern) ────────────────

function CategoryPicker({ onClose, onSelect }) {
  // path = navigatiehistorie: [] = hoofdscherm, [{key,label}] = subcategorie, etc.
  const [path, setPath] = useState([]);
  const [closing, setClosing] = useState(false);

  const close = () => { setClosing(true); setTimeout(onClose, 220); };

  // Huidige items op basis van pad door CATEGORY_TREE
  const currentItems = path.reduce(
    (items, { key }) => items.find(it => it.key === key)?.types || [],
    CATEGORY_TREE,
  );

  const handleRow = (item) => {
    if (item.types) {
      setPath(prev => [...prev, { key: item.key, label: item.label }]);
    } else {
      const cat  = path.length === 0 ? item.key : path[0].key;
      const type = path.length === 0 ? null     : item.key;
      setClosing(true);
      setTimeout(() => onSelect(cat, type), 220);
    }
  };

  const goBack = () => setPath(prev => prev.slice(0, -1));

  const isMain     = path.length === 0;
  const heading    = isMain ? 'Wat wil je delen?' : path[path.length - 1].label;
  const breadcrumb = path.length > 1 ? path[path.length - 2].label : null;

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.55)',
    borderRadius: RADIUS.lg,
    padding: '14px 16px',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,10,18,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: `${closing ? 'overlayOut 0.22s ease-in' : 'overlayIn 0.18s ease-out'} forwards`,
      }}
      onClick={close}
    >
      <div
        style={{
          width: '100%', maxWidth: 350,
          background: COLORS.surfaceModal,
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: RADIUS.xl,
          padding: '28px 20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: `${closing ? 'modalOut 0.22s ease-in' : 'modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1)'} forwards`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {isMain ? (
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>
            Wat wil je delen?
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={goBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label="Terug">
                <ArrowCircleLeftIcon size={40} weight="regular" color={COLORS.text} />
              </button>
              <div>
                {breadcrumb && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
                    {breadcrumb}
                  </div>
                )}
                <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{heading}</div>
              </div>
            </div>
          </div>
        )}

        {/* Rijen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
          {currentItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.key} onClick={() => handleRow(item)} className="tap-feedback" style={rowStyle}>
                <Icon size={28} weight="regular" color={COLORS.text} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>}
                </div>
                {item.types && <CaretRightIcon size={16} weight="bold" color={COLORS.textDim} />}
              </div>
            );
          })}
        </div>

        {/* Knoppen */}
        <button onClick={close} style={{ ...s.cancelBtn, marginTop: 16 }}>
          Annuleren
        </button>
      </div>
    </div>
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

function EditPostSheet({ post, onClose, onSave, streetId }) {
  const toDateInput = (d) => d ? d.substring(0, 10) : '';

  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body || '');
  const [startHouse, setStartHouse] = useState(post.start_house || '');
  const [endHouse, setEndHouse] = useState(post.end_house || '');
  const [startDate, setStartDate] = useState(toDateInput(post.start_date));
  const [endDate, setEndDate] = useState(toDateInput(post.end_date));
  const [startTime, setStartTime] = useState(post.start_time || '');
  const [endTime, setEndTime] = useState(post.end_time || '');
  const [eventDate, setEventDate] = useState(post.event_date || '');
  const [eventTime, setEventTime] = useState(post.event_time || '');
  const [link, setLink] = useState(post.link || '');
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  const isEvent      = post.category === 'evenement' || post.category === 'event';
  const isBezorging  = post.category === 'bezorging' || post.category === 'package';
  const isAlgemeen   = post.category === 'algemeen';
  const isGezocht    = isBezorging && (post.sub_type === 'gezocht' || post.sub_type === 'search');
  const isBezorgd    = isBezorging && (post.sub_type === 'bezorgd' || post.sub_type === 'have');
  const hasDateRange = ['straatzaken', 'works', 'blockage', 'container'].includes(post.category);
  const hasTimeRange = post.category === 'straatzaken' || post.category === 'works';
  const hasLink      = ['straatzaken', 'works', 'blockage', 'container', 'waste'].includes(post.category);

  return (
    <SheetOverlay closing={closing}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={s.sheetTitle}>Bericht bewerken</div>
          <CatBadge cat={post.category} />
        </div>

        <label style={s.label}>{t('title')}</label>
        <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} />

        <label style={s.label}>Omschrijving</label>
        <AutoTextarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} />

        {isBezorgd && (
          <>
            <label style={s.label}>Huisnummer geadresseerde</label>
            <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} style={{ marginBottom: 14 }} />
          </>
        )}

        {!isBezorging && !isAlgemeen && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Van nr.</label>
              <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} showSuffix={false} />
            </div>
            <div>
              <label style={s.label}>Tot nr.</label>
              <HouseNumberPicker streetId={streetId} value={endHouse} onChange={setEndHouse} showSuffix={false} />
            </div>
          </div>
        )}

        {hasDateRange && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={s.label}>Datum van</label>
                <input style={s.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              {hasTimeRange && (
                <div>
                  <label style={s.label}>Tijd van</label>
                  <input style={s.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={s.label}>Datum tot</label>
                <input style={s.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              {hasTimeRange && (
                <div>
                  <label style={s.label}>Tijd tot</label>
                  <input style={s.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        {isEvent && (
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
        )}

        {hasLink && (
          <>
            <label style={s.label}>Externe link</label>
            <input style={s.input} placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
          </>
        )}

        <button style={s.submitBtn} disabled={!title.trim()} onClick={() => {
          onSave(post.id, {
            title, body,
            startHouse: startHouse || undefined,
            endHouse: endHouse || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            eventDate: eventDate || undefined,
            eventTime: eventTime || undefined,
            link: link || undefined,
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
              <div onClick={item.action} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 16, color: item.destructive ? COLORS.error : COLORS.text, fontWeight: 400, cursor: 'pointer' }}>
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

// ─── NEW POST SHEET ────────────────────────────────────────────────────────────

function NewPostSheet({ onClose, onBack, onSubmit, streetId, canPin, user, initialCat = 'bezorging', initialType = null }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startHouse, setStartHouse] = useState('');
  const [endHouse, setEndHouse] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [link, setLink] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [photoKey, setPhotoKey] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  const back  = () => { setClosing(true); setTimeout(onBack,  220); };

  const isBezorging   = initialCat === 'bezorging'   || initialCat === 'package';
  const isStraatzaken = initialCat === 'straatzaken'  || initialCat === 'works';
  const isMelding     = initialCat === 'melding'      || initialCat === 'incident';
  const isEvenement   = initialCat === 'evenement'    || initialCat === 'event';
  const isAlgemeen    = initialCat === 'algemeen';
  const isGezocht = initialType === 'pakket_gezocht'    || initialType === 'gezocht';
  const isBezorgd = initialType === 'pakket_aangenomen' || initialType === 'bezorgd';

  // Gezocht: de poster zoekt z'n eigen pakket — geen invoerveld nodig, het
  // huisnummer is al bekend uit het account
  const autoTitle = isGezocht
    ? (user?.house_number ? `Pakket gezocht voor nr. ${user.house_number}` : 'Pakket gezocht')
    : startHouse.trim() ? `Pakket aangenomen voor nr. ${startHouse.trim()}` : '';

  const canSubmit = !uploading && (isBezorging
    ? (isGezocht || !!startHouse.trim())
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
      startHouse: startHouse.trim() || undefined,
      endHouse: endHouse.trim() || undefined,
      startDate: isStraatzaken ? (startDate || undefined) : undefined,
      endDate: (isStraatzaken || isEvenement) ? (endDate || undefined) : undefined,
      startTime: isStraatzaken ? (startTime || undefined) : undefined,
      endTime: isStraatzaken ? (endTime || undefined) : undefined,
      link: isStraatzaken ? (link.trim() || undefined) : undefined,
      eventDate: isEvenement ? (eventDate || undefined) : undefined,
      eventTime: isEvenement ? (eventTime || undefined) : undefined,
      photoKey: photoKey || undefined,
    });
    close();
  };

  const heading      = initialType ? typeLabel(initialCat, initialType) : catLabel(initialCat);
  const categoryPath = initialType ? catLabel(initialCat) : null;

  const houseRow = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      <div>
        <label style={s.label}>Van nr. *</label>
        <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} showSuffix={false} />
      </div>
      <div>
        <label style={s.label}>Tot nr.</label>
        <HouseNumberPicker streetId={streetId} value={endHouse} onChange={setEndHouse} showSuffix={false} />
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,10,18,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: `${closing ? 'overlayOut 0.22s ease-in' : 'overlayIn 0.18s ease-out'} forwards`,
      }}
      onClick={close}
    >
      <div
        style={{
          width: '100%', maxWidth: 350,
          background: COLORS.surfaceModal,
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: RADIUS.xl,
          padding: '28px 20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          animation: `${closing ? 'modalOut 0.22s ease-in' : 'modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1)'} forwards`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={back} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label="Terug">
              <ArrowCircleLeftIcon size={40} weight="regular" color={COLORS.text} />
            </button>
            <div>
              {categoryPath && (
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
                  {categoryPath}
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{heading}</div>
            </div>
          </div>
        </div>

        {/* Scrollbaar formuliergebied */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 4 }}>

      {/* Bezorging */}
      {isBezorging && (
        <>
          {isBezorgd && (
            <>
              <label style={s.label}>Huisnummer geadresseerde *</label>
              <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} style={{ marginBottom: 10 }} />
              {autoTitle && <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 12 }}>Titel: <em>{autoTitle}</em></div>}
            </>
          )}
          {isGezocht && (
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
              Je eigen huisnummer staat al bij je bericht — daar hoef je niets voor in te vullen.
            </div>
          )}
          <label style={s.label}>Omschrijving</label>
          <AutoTextarea style={{ ...s.textarea, minHeight: 60 }} value={body} onChange={e => setBody(e.target.value)} />
        </>
      )}

      {/* Straatzaken */}
      {isStraatzaken && (
        <>
          <label style={s.label}>Titel *</label>
          <input style={s.input} placeholder="Bijv. Vervanging gasleiding" value={title} onChange={e => setTitle(e.target.value)} />
          {houseRow}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={s.label}>Datum van</label>
              <input type="date" style={{ ...s.input, marginBottom: 0 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Tijd van</label>
              <input type="time" style={{ ...s.input, marginBottom: 0 }} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Datum tot</label>
              <input type="date" style={{ ...s.input, marginBottom: 0 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Tijd tot</label>
              <input type="time" style={{ ...s.input, marginBottom: 0 }} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <label style={s.label}>Link</label>
          <input type="url" style={s.input} placeholder="https://…" value={link} onChange={e => setLink(e.target.value)} />
          <label style={s.label}>Omschrijving</label>
          <AutoTextarea style={{ ...s.textarea, minHeight: 60 }} value={body} onChange={e => setBody(e.target.value)} />
        </>
      )}

      {/* Melding */}
      {isMelding && (
        <>
          <label style={s.label}>Onderwerp *</label>
          <input style={s.input} placeholder="Kort en duidelijk" value={title} onChange={e => setTitle(e.target.value)} />
          {houseRow}
          <label style={s.label}>Omschrijving *</label>
          <AutoTextarea style={s.textarea} value={body} onChange={e => setBody(e.target.value)} />
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
          {houseRow}
          <label style={s.label}>Omschrijving</label>
          <AutoTextarea style={{ ...s.textarea, minHeight: 60 }} value={body} onChange={e => setBody(e.target.value)} />
        </>
      )}

      {/* Algemeen */}
      {isAlgemeen && (
        <>
          <label style={s.label}>Titel *</label>
          <input style={s.input} placeholder="Bijv. Tweedehands bank te koop" value={title} onChange={e => setTitle(e.target.value)} />
          <label style={s.label}>Omschrijving</label>
          <AutoTextarea style={{ ...s.textarea, minHeight: 60 }} value={body} onChange={e => setBody(e.target.value)} />
        </>
      )}

          <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading}
            onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); if (key) setPhotoKey(key); }} />
        </div>

        {/* Vaste CTA's */}
        <div style={{ flexShrink: 0 }}>
          <button
            style={{ width: '100%', background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '14px 24px', fontSize: 16, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', marginTop: 16, opacity: canSubmit ? 1 : 0.35 }}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {t('publish')}
          </button>
          <button style={{ ...s.cancelBtn, marginTop: 8 }} onClick={close}>{t('cancel')}</button>
        </div>
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
    <>
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
                  <button style={{ flex: 1, background: 'none', color: COLORS.error, border: `1px solid ${COLORS.error}`, borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer' }} onClick={() => reject(p.id)}>{t('reject')}</button>
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
    </>
  );
}

// ─── NOTIFICATIE-INBOX ─────────────────────────────────────────────────────────

function NotificationInboxSheet({ onClose, onOpenPost }) {
  const [closing, setClosing] = useState(false);
  const [items, setItems] = useState(null);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  useEffect(() => {
    api.get('/notifications').then(setItems).catch(() => setItems([]));
    api.post('/notifications/read-all').catch(() => {});
  }, []);

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetHandle} />
      <div style={s.sheetTitle}>Notificaties</div>
      {items === null ? (
        <div style={s.emptyState}>{t('loading')}</div>
      ) : items.length === 0 ? (
        <div style={s.emptyState}>Nog geen notificaties</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: '60vh', overflowY: 'auto' }}>
          {items.map(item => (
            <div key={item.id}
              onClick={() => { if (item.post_id) { onOpenPost(item.post_id); close(); } }}
              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: RADIUS.lg, padding: '12px 14px', cursor: item.post_id ? 'pointer' : 'default' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{item.title}</div>
              {item.body && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{item.body}</div>}
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>{timeAgo(item.created_at)}</div>
            </div>
          ))}
        </div>
      )}
      <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

// ─── PROFIEL VIEW ──────────────────────────────────────────────────────────────
// Consolideert wat eerder losse tabs waren (Mijn straten, Beheer,
// Instellingen) — de bottom nav houdt alleen Feed + Hall of Fame over.

function ProfileView({ user, onLogout, canModerate, streetId, memberCount, households }) {
  const [lang, setLangState] = useState(getLang());
  const [notifs, setNotifs] = useState({});
  const [subscribeMsg, setSubscribeMsg] = useState('');
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
      </div>

      <div style={s.sectionLabel}>{t('your_streets')}</div>
      <div style={{ padding: '0 12px' }}>
        <StreetsView user={user} />
      </div>

      {canModerate && (
        <>
          <div style={s.sectionLabel}>{t('admin')}</div>
          <AdminView streetId={streetId} user={user} memberCount={memberCount} households={households} />
        </>
      )}

      <div style={s.sectionLabel}>{t('notifications')}</div>
      <div style={{ padding: '0 12px' }}>
        {isIOS && !subscribed && (
          <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{t('pwa_ios_hint')}</div>
        )}
        {notifSupported && !subscribed && permission !== 'denied' && (
          <>
            <button style={{ ...s.submitBtn, marginBottom: 12 }} onClick={async () => {
              const result = await subscribe();
              setSubscribeMsg(result.ok ? 'Notificaties staan nu aan' : (result.error || ''));
            }}>{t('enable_notifications')}</button>
            {subscribeMsg && (
              <div style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, fontSize: 12, color: COLORS.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                <span>{subscribeMsg}</span>
                <button onClick={() => setSubscribeMsg('')} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: COLORS.textDim, flexShrink: 0 }}>
                  <XIcon size={14} weight="bold" />
                </button>
              </div>
            )}
          </>
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

      <div style={{ padding: '0 12px' }}>
        <button style={{ ...s.cancelBtn, marginTop: 4 }} onClick={onLogout}>{t('logout')}</button>
      </div>
    </div>
  );
}

// ─── STREETS VIEW ──────────────────────────────────────────────────────────────

// ─── HALL OF FAME ──────────────────────────────────────────────────────────────

function HallOfFameView({ streetId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/streets/${streetId}/hall-of-fame`).then(setData).catch(() => {});
  }, [streetId]);

  if (!data) return <div style={s.feed}><div style={s.emptyState}>{t('loading')}</div></div>;

  const monthStats = [
    { label: 'pakketten bezorgd', value: data.thisMonth.packagesDelivered },
    { label: 'spullen uitgeleend', value: data.thisMonth.itemsLent },
    { label: 'evenementen georganiseerd', value: data.thisMonth.eventsOrganized },
    { label: 'aanbevelingen geplaatst', value: data.thisMonth.recommendationsPosted },
  ];

  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>Hall of Fame</div>
      {data.titles.map(title => (
        <div key={title.key} style={{ ...s.streetCard, cursor: 'default', display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrophyIcon size={26} weight="duotone" color={COLORS.accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>{title.label}</div>
            {title.winner ? (
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginTop: 2 }}>
                {title.winner.name} {title.winner.houseNumber}
                <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.textMuted }}> · {title.winner.count}x</span>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: COLORS.textDim, marginTop: 2 }}>Nog niemand — wees de eerste!</div>
            )}
          </div>
        </div>
      ))}

      <div style={s.sectionLabel}>Deze maand</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 12px' }}>
        {monthStats.map(stat => (
          <div key={stat.label} style={{ ...s.streetCard, margin: 0, cursor: 'default', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.accent }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreetsView({ user }) {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.get('/streets').then(setStreets).catch(() => {});
  }, []);

  return (
    <>
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
      <div style={{ ...s.streetCard, opacity: 0.5 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('request_street')}</div>
      </div>
    </>
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
  const { toast, showToast, dismissToast } = useToast();
  const [tab, setTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [pendingCat, setPendingCat] = useState('bezorging');
  const [pendingType, setPendingType] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [joinDetail, setJoinDetail] = useState(null);
  const [streetInfo, setStreetInfo] = useState(null);
  const [editPost, setEditPost] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deepLinkPostId, setDeepLinkPostId] = useState(null);
  const [showNotifInbox, setShowNotifInbox] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const STREET_ID = 1; // Reyer Anslostraat (first street)

  const membership = user?.memberships?.find(m => m.streetId === STREET_ID);
  const canModerate = user?.is_super_admin || ['admin', 'moderator'].includes(membership?.role);
  const canPin = user?.is_super_admin || membership?.role === 'admin';
  const pendingCount = 0; // Fetched in AdminView, badge handled separately

  const showError = useCallback((message) => {
    showToast(message, { borderColor: COLORS.error, textColor: COLORS.error });
  }, [showToast]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/streets/${STREET_ID}/posts`);
      setPosts(data);
    } catch (e) {
      showError(e.message || 'Feed laden mislukt');
    }
    setLoading(false);
  }, [showError]);

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

  // Notificatie-inbox is de bron van waarheid — onafhankelijk van push
  useEffect(() => {
    api.get('/notifications/unread-count').then(d => setUnreadCount(d.count)).catch(() => {});
  }, []);

  // Deep link vanuit een notificatie: ?post=<id> direct naar de juiste post
  const handleDeepLink = useCallback((url) => {
    let parsed;
    try {
      parsed = new URL(url, window.location.origin);
    } catch {
      return;
    }
    const postId = parsed.searchParams.get('post');
    if (!postId) return;
    parsed.searchParams.delete('post');
    window.history.replaceState(null, '', parsed.pathname + (parsed.search || '') + parsed.hash);
    setTab('feed');
    setFilter('all');
    setDeepLinkPostId(Number(postId));
  }, []);

  useEffect(() => {
    handleDeepLink(window.location.href);
  }, [handleDeepLink]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === 'navigate' && e.data.url) handleDeepLink(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [handleDeepLink]);

  useEffect(() => {
    if (!deepLinkPostId || loading) return;
    if (!posts.some(p => p.id === deepLinkPostId)) return;
    const el = document.getElementById(`post-${deepLinkPostId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setDeepLinkPostId(null);
  }, [deepLinkPostId, posts, loading]);

  const handleLike = async (id) => {
    try {
      const { liked } = await api.post(`/streets/${STREET_ID}/posts/${id}/like`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, liked, likes: Number(p.likes) + (liked ? 1 : -1) } : p));
    } catch (e) {
      showError(e.message || 'Vind-ik-leuk mislukt');
    }
  };

  const handleRsvp = async (id, type) => {
    try {
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
    } catch (e) {
      showError(e.message || 'RSVP mislukt');
    }
  };

  const handleReport = async (id) => {
    try {
      await api.post(`/streets/${STREET_ID}/posts/${id}/report`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, reported: true } : p));
      showToast(t('reported_toast'), { borderColor: COLORS.error, duration: 2500 });
    } catch (e) {
      showError(e.message || 'Melden mislukt');
    }
  };

  const handleDeleteClick = (id) => setDeleteConfirm(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await api.delete(`/streets/${STREET_ID}/posts/${id}`);
      setPosts(ps => ps.filter(p => p.id !== id));
    } catch (e) {
      showError(e.message || 'Verwijderen mislukt');
    }
  };

  const handleResolve = async (id, resolved) => {
    await api.patch(`/streets/${STREET_ID}/posts/${id}/resolve`, { resolved });
    setPosts(ps => ps.map(p => p.id === id ? { ...p, resolved } : p));
  };

  const handleNewPost = async (data) => {
    try {
      const post = await api.post(`/streets/${STREET_ID}/posts`, data);
      // POST geeft alleen de ruwe rij terug — auteur/likes/comments komen
      // pas uit de GET-query (met JOINs). Zonder dit flitst "Bewoner" en
      // NaN even op tot de volgende reload.
      setPosts(ps => [{
        ...post,
        author_name: user?.name,
        author_house: user?.house_number,
        author_role: membership?.role,
        likes: 0,
        comments: 0,
        reports: 0,
        liked: false,
        my_rsvp: null,
        my_join: false,
        joiners: [],
        rsvp: { yes: [], maybe: [], no: [] },
      }, ...ps]);
    } catch (e) {
      showError(e.message || 'Bericht plaatsen mislukt');
    }
  };

  const handleEdit = async (postId, data) => {
    try {
      const updated = await api.patch(`/streets/${STREET_ID}/posts/${postId}`, data);
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, ...updated } : p));
    } catch (e) {
      showError(e.message || 'Bewerken mislukt');
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
      showError(e.message || 'Aanmelden mislukt');
    }
  };

  const visiblePosts = filter === 'all' ? posts : posts.filter(p => p.category === filter);
  const pinnedPosts = visiblePosts.filter(p => p.pinned);
  const regularPosts = visiblePosts.filter(p => !p.pinned);

  return (
    <div style={s.app}>
      <Toast toast={toast} onDismiss={dismissToast} />

      <div style={s.header}>
        <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
        <div style={s.headerActions}>
          <button
            style={{ ...s.headerIconBtn(showNotifInbox), position: 'relative' }}
            title="Notificaties"
            aria-label="Notificaties"
            onClick={() => setShowNotifInbox(true)}
          >
            <BellIcon size={20} weight={unreadCount > 0 ? 'fill' : 'regular'} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: COLORS.interactionNotification, border: `1.5px solid ${COLORS.surface}` }} />
            )}
          </button>
          <button
            style={s.headerIconBtn(tab === 'profile')}
            title="Profiel"
            aria-label="Profiel"
            onClick={() => setTab('profile')}
          >
            <UserIcon size={20} weight="regular" />
          </button>
        </div>
      </div>

      {tab === 'feed' && (
        <div style={{ ...s.feed, filter: (showPost || showCatPicker || !!eventDetail || !!joinDetail || !!editPost) ? 'blur(4px)' : 'none', transition: 'filter 0.2s', pointerEvents: (showPost || showCatPicker || !!eventDetail || !!joinDetail || !!editPost) ? 'none' : 'auto' }}>
          {notifSupported && !subscribed && permission !== 'denied' && (
            <div style={{ margin: '12px 12px 0', background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>Blijf op de hoogte</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>Ontvang een melding bij nieuwe berichten in de straat</div>
              </div>
              <button onClick={async () => {
                const result = await subscribe();
                if (result.ok) showToast('Notificaties staan nu aan', { dismissible: true, wrap: true, duration: 0 });
                else if (result.error) showToast(result.error, { dismissible: true, wrap: true, duration: 0 });
              }} style={{ background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                {pinnedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onDelete={handleDeleteClick} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} autoExpand={p.id === deepLinkPostId} onError={showError} />)}</>
              )}
              <div style={s.sectionLabel}>{t('recent')}</div>
              {regularPosts.length === 0
                ? <div style={s.emptyState}>{t('no_posts')}</div>
                : regularPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} onDelete={handleDeleteClick} onOpenJoin={setJoinDetail} canModerate={canModerate} onEdit={setEditPost} canEdit={(p.user_id === user?.id) || canModerate} autoExpand={p.id === deepLinkPostId} onError={showError} />)}
            </>
          }
        </div>
      )}

      {tab === 'hof' && <HallOfFameView streetId={STREET_ID} />}
      {tab === 'profile' && (
        <ProfileView user={user} onLogout={logout} canModerate={canModerate} streetId={STREET_ID}
          memberCount={streetInfo?.members || 0} households={streetInfo?.households || 0} />
      )}

      <div style={s.bottomBar}>
        <div style={s.tabBar}>
          {[
            { id: 'feed', label: t('feed'), icon: HouseIcon },
            { id: 'hof', label: 'Hall of Fame', icon: TrophyIcon },
          ].map(tab_ => {
            const active = tab === tab_.id;
            const TabIcon = tab_.icon;
            return (
              <button key={tab_.id} style={s.tab(active)} onClick={() => setTab(tab_.id)} aria-label={tab_.label} title={tab_.label}>
                <TabIcon size={20} weight={active ? 'bold' : 'regular'} />
              </button>
            );
          })}
        </div>

        <button style={s.postCta(tab === 'feed')} onClick={() => setShowCatPicker(true)} aria-label="Bericht plaatsen" title="Bericht plaatsen" tabIndex={tab === 'feed' ? 0 : -1}>
          <PlusIcon size={22} weight="bold" style={{ flexShrink: 0 }} />
        </button>
      </div>

      {showCatPicker && (
        <CategoryPicker
          onClose={() => setShowCatPicker(false)}
          onSelect={(cat, type) => {
            setPendingCat(cat);
            setPendingType(type);
            setShowCatPicker(false);
            setTimeout(() => setShowPost(true), 220);
          }}
        />
      )}
      {showPost && (
        <NewPostSheet onClose={() => setShowPost(false)}
          onBack={() => { setShowPost(false); setTimeout(() => setShowCatPicker(true), 220); }}
          onSubmit={(data) => { handleNewPost(data); setShowPost(false); window.scrollTo({ top: 0, behavior: 'instant' }); }}
          streetId={STREET_ID} canPin={canPin} user={user} initialCat={pendingCat} initialType={pendingType} />
      )}
      {showNotifInbox && (
        <NotificationInboxSheet
          onClose={() => { setShowNotifInbox(false); setUnreadCount(0); }}
          onOpenPost={(postId) => handleDeepLink(`/?post=${postId}`)}
        />
      )}
      {eventDetail && (
        <EventDetailSheet post={eventDetail} onClose={() => setEventDetail(null)} onRsvp={handleRsvp} />
      )}
      {joinDetail && (
        <JoinDetailSheet post={joinDetail} onClose={() => setJoinDetail(null)} onJoin={handleJoin} />
      )}
      {editPost && (
        <EditPostSheet post={editPost} onClose={() => setEditPost(null)} onSave={handleEdit} streetId={STREET_ID} />
      )}
      {deleteConfirm && (
        <div style={s.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...s.sheet, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <div style={s.sheetTitle}>Bericht verwijderen?</div>
            <p style={{ fontSize: 15, color: COLORS.textDim, lineHeight: 1.5, marginBottom: 20 }}>
              Weet je zeker dat je dit bericht wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <button style={{ ...s.submitBtn, background: COLORS.error }} onClick={handleDeleteConfirmed}>
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
