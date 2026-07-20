import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './hooks/useAuth.jsx';
import { usePush, notifSupported } from './hooks/usePush.jsx';
import { useToast } from './hooks/useToast.jsx';
import { api } from './api/client.js';
import { t, getLang, setLang } from './i18n/index.js';

import { COLORS, RADIUS, ALPHA } from './design/tokens.js';
import { s } from './design/appStyles.js';
import PostCard from './components/PostCard.jsx';
import Toast from './components/Toast.jsx';
import CatBadge from './components/CatBadge.jsx';
import SheetOverlay from './components/SheetOverlay.jsx';
import CategoryPicker from './components/CategoryPicker.jsx';
import Switch from './components/Switch.jsx';
import NewPostSheet from './components/NewPostSheet.jsx';
import EditPostSheet from './components/EditPostSheet.jsx';
import ConfirmationSheet from './components/ConfirmationSheet.jsx';
import { CATEGORIES, catLabel } from './utils/categories.js';
import { timeAgo } from './utils/time.js';
import { formatEventDate, downloadICS, googleCalendarUrl } from './utils/eventDate.js';

// Phosphor Icons — subpath imports per icoon i.p.v. de barrel, voor kleinere bundle
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
// Custom Streetfeed Icon System icons (see src/icons/index.jsx)
import { PersonIcon, BellIcon, PlusIcon, CrossIcon } from './icons/index.jsx';

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const map = { admin: [COLORS.accent, 'Admin'], moderator: [COLORS.purple, 'Mod'], resident: [COLORS.textDim, 'Bewoner'] };
  const [color, label] = map[role] || [COLORS.textDim, role];
  return <span style={s.badge(color)}>{label}</span>;
}

// ─── EVENT DETAIL SHEET ────────────────────────────────────────────────────────

function EventDetailSheet({ post, onClose, onRsvp }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };
  const yes = post.rsvp?.yes || [];
  const maybe = post.rsvp?.maybe || [];
  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
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

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────

function AdminView({ streetId, user, memberCount, households, onError }) {
  const [subTab, setSubTab] = useState('queue');
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (subTab === 'queue') {
      api.get(`/streets/${streetId}/pending`).then(setPending).catch(e => onError(e.message || t('generic_error')));
    }
    if (subTab === 'members') {
      api.get(`/streets/${streetId}/members`).then(setMembers).catch(e => onError(e.message || t('generic_error')));
    }
  }, [subTab, streetId, onError]);

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
          <button key={id} type="button" style={s.filterChip(subTab === id)} aria-pressed={subTab === id} onClick={() => setSubTab(id)}>{label}</button>
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
                  {p.house_number ? t('house_nr', { n: p.house_number }) : p.email} · {timeAgo(p.created_at)}
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
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.house_number ? t('house_nr', { n: m.house_number }) : m.email}</div>
              </div>
              <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                <option value="resident">{t('resident')}</option>
                <option value="moderator">{t('moderator')}</option>
                <option value="admin">{t('street_admin')}</option>
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

function NotificationInboxSheet({ onClose, onOpenPost, onError }) {
  const [closing, setClosing] = useState(false);
  const [items, setItems] = useState(null);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  useEffect(() => {
    api.get('/notifications').then(setItems).catch(e => {
      setItems([]);
      onError(e.message || t('generic_error'));
    });
    api.post('/notifications/read-all').catch(e => onError(e.message || t('generic_error')));
  }, [onError]);

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetTitle}>{t('notifications')}</div>
      {items === null ? (
        <div style={s.emptyState}>{t('loading')}</div>
      ) : items.length === 0 ? (
        <div style={s.emptyState}>{t('no_notifications_yet')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: '60vh', overflowY: 'auto' }}>
          {items.map(item => {
            const itemStyle = { display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: RADIUS.lg, padding: '12px 14px' };
            const content = (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{item.title}</div>
                {item.body && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{item.body}</div>}
                <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>{timeAgo(item.created_at)}</div>
              </>
            );
            // Only items with a post_id are actually navigable — those become
            // a real button (keyboard/screen-reader accessible for free);
            // the rest stay a plain, non-interactive div.
            return item.post_id ? (
              <button key={item.id} type="button" onClick={() => { onOpenPost(item.post_id); close(); }} style={{ ...itemStyle, cursor: 'pointer' }}>
                {content}
              </button>
            ) : (
              <div key={item.id} style={itemStyle}>
                {content}
              </div>
            );
          })}
        </div>
      )}
      <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}

// ─── PROFIEL VIEW ──────────────────────────────────────────────────────────────
// Consolideert wat eerder losse tabs waren (Mijn straten, Beheer,
// Instellingen) — de bottom nav houdt alleen Feed + Hall of Fame over.

function ProfileView({ user, onLogout, canModerate, streetId, streetName, memberCount, households, onError }) {
  const [lang, setLangState] = useState(getLang());
  const [notifs, setNotifs] = useState({});
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const { permission, subscribed, subscribe } = usePush();
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);

  useEffect(() => {
    api.get('/push/settings').then(data => setNotifs(prev => ({ ...Object.fromEntries(Object.keys(CATEGORIES).map(k => [k, true])), ...data })))
      .catch(e => onError(e.message || t('generic_error')));
  }, [onError]);

  const toggleNotif = async (key) => {
    const prev = notifs;
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    // Optimistic update rolled back on failure — otherwise the toggle keeps
    // showing the flipped state even though the server never got it.
    await api.patch('/push/settings', { settings: { [key]: next[key] } }).catch(e => {
      setNotifs(prev);
      onError(e.message || t('generic_error'));
    });
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
        {[{ label: t('name'), value: user.name }, { label: t('address'), value: (user.house_number && streetName) ? t('profile_address_value', { street: streetName, number: user.house_number }) : (user.house_number || '–') }, { label: t('role'), value: roleLabel() }].map(item => (
          <div key={item.label} style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>{t('your_streets')}</div>
      <div style={{ padding: '0 12px' }}>
        <StreetsView user={user} onError={onError} />
      </div>

      {canModerate && (
        <>
          <div style={s.sectionLabel}>{t('admin')}</div>
          <AdminView streetId={streetId} user={user} memberCount={memberCount} households={households} onError={onError} />
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
              setSubscribeMsg(result.ok ? t('notifications_enabled_toast') : (result.error || ''));
            }}>{t('enable_notifications')}</button>
            {subscribeMsg && (
              <div style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, fontSize: 12, color: COLORS.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
                <span>{subscribeMsg}</span>
                <button onClick={() => setSubscribeMsg('')} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: COLORS.textDim, flexShrink: 0 }} aria-label={t('close')}>
                  <CrossIcon size={14} />
                </button>
              </div>
            )}
          </>
        )}
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <div key={key} style={{ ...s.adminCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{catLabel(key)}</span>
            <Switch checked={!!notifs[key]} onChange={() => toggleNotif(key)} label={catLabel(key)} />
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>{t('language')}</div>
      <div style={{ padding: '0 12px' }}>
        <div style={s.adminCard}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['nl', 'Nederlands'], ['en', 'English']].map(([code, label]) => (
              <button key={code} type="button" aria-pressed={lang === code} onClick={() => switchLang(code)}
                style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: lang === code ? 700 : 400, background: lang === code ? COLORS.accent : 'none', color: lang === code ? '#000' : COLORS.textMuted, cursor: 'pointer', border: 'none' }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.sectionLabel}>{t('terms_title')}</div>
      <div style={{ padding: '0 12px' }}>
        <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          {t('terms_body').map(item => <div key={item} style={{ padding: '3px 0' }}>{item}</div>)}
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

function HallOfFameView({ streetId, onError }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/streets/${streetId}/hall-of-fame`).then(setData).catch(e => onError(e.message || t('generic_error')));
  }, [streetId, onError]);

  if (!data) return <div style={s.feed}><div style={s.emptyState}>{t('loading')}</div></div>;

  // title.label comes from the backend (/streets/:id/hall-of-fame) — the
  // backend has no locale awareness at all (frontend-only i18n), so these
  // specific labels can't follow the language switch yet. Out of scope for
  // FRE-339 (frontend sweep); would need the API to accept/return a locale.
  const monthStats = [
    { label: t('stat_packages_delivered'), value: data.thisMonth.packagesDelivered },
    { label: t('stat_items_lent'), value: data.thisMonth.itemsLent },
    { label: t('stat_events_organized'), value: data.thisMonth.eventsOrganized },
    { label: t('stat_recommendations_posted'), value: data.thisMonth.recommendationsPosted },
  ];

  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>{t('hall_of_fame_title')}</div>
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
              <div style={{ fontSize: 14, color: COLORS.textDim, marginTop: 2 }}>{t('hall_of_fame_no_winner')}</div>
            )}
          </div>
        </div>
      ))}

      <div style={s.sectionLabel}>{t('hall_of_fame_this_month')}</div>
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

function StreetsView({ user, onError }) {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.get('/streets').then(setStreets).catch(e => onError(e.message || t('generic_error')));
  }, [onError]);

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
            {st.role === 'admin' && <span style={s.badge(COLORS.accent)}>{t('admin_short')}</span>}
            {st.role === 'moderator' && <span style={s.badge(COLORS.purple)}>{t('moderator_short')}</span>}
          </div>
        </div>
      ))}
      <div style={{ ...s.streetCard, opacity: 0.5 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>{t('request_street')}</div>
      </div>
    </>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const { user, logout } = useAuth();
  const { permission, subscribed, subscribe } = usePush();
  const { toast, showToast, dismissToast } = useToast();
  const [tab, setTab] = useState('feed');
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
      showError(e.message || t('generic_error'));
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
    api.get(`/streets/${STREET_ID}`).then(setStreetInfo).catch(e => showError(e.message || t('generic_error')));
  }, [showError]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Notificatie-inbox is de bron van waarheid — onafhankelijk van push.
  // Just a badge count — a toast for this would be more annoying than useful,
  // logged only (FRE-348's own suggested judgment call for low-stakes fetches).
  useEffect(() => {
    api.get('/notifications/unread-count').then(d => setUnreadCount(d.count))
      .catch(err => console.error('[app] unread-count fetch failed', err));
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
      showError(e.message || t('generic_error'));
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
      showError(e.message || t('generic_error'));
    }
  };

  const handleReport = async (id) => {
    try {
      await api.post(`/streets/${STREET_ID}/posts/${id}/report`);
      setPosts(ps => ps.map(p => p.id === id ? { ...p, reported: true } : p));
      showToast(t('reported_toast'), { borderColor: COLORS.error, duration: 2500 });
    } catch (e) {
      showError(e.message || t('generic_error'));
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
      showError(e.message || t('generic_error'));
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
      showError(e.message || t('generic_error'));
    }
  };

  const handleEdit = async (postId, data) => {
    try {
      const updated = await api.patch(`/streets/${STREET_ID}/posts/${postId}`, data);
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, ...updated } : p));
    } catch (e) {
      showError(e.message || t('generic_error'));
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
      showError(e.message || t('generic_error'));
    }
  };

  // Pilot v1: one unified neighbourhood feed, no category filtering — see
  // "Streetfeed Feed Structure — Pilot v1". Category data/model (CATEGORIES,
  // post.category) stays intact for a possible future Filter Sheet.
  const pinnedPosts = posts.filter(p => p.pinned);
  const regularPosts = posts.filter(p => !p.pinned);

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
            <BellIcon size={20} filled={unreadCount > 0} />
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
            <PersonIcon size={20} />
          </button>
        </div>
      </div>
      <div style={s.headerSpacer} />

      {tab === 'feed' && (
        <div style={{ ...s.feed, filter: (showPost || showCatPicker || !!eventDetail || !!joinDetail || !!editPost) ? 'blur(4px)' : 'none', transition: 'filter 0.2s', pointerEvents: (showPost || showCatPicker || !!eventDetail || !!joinDetail || !!editPost) ? 'none' : 'auto' }}>
          {notifSupported && !subscribed && permission !== 'denied' && (
            <div style={{ margin: '12px 12px 0', background: ALPHA.accentSubtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{t('notifications_banner_title')}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>{t('notifications_banner_body')}</div>
              </div>
              <button onClick={async () => {
                const result = await subscribe();
                if (result.ok) showToast(t('notifications_enabled_toast'), { dismissible: true, wrap: true, duration: 0 });
                else if (result.error) showToast(result.error, { dismissible: true, wrap: true, duration: 0 });
              }} style={{ background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('notifications_banner_cta')}
              </button>
            </div>
          )}
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

      {tab === 'hof' && <HallOfFameView streetId={STREET_ID} onError={showError} />}
      {tab === 'profile' && (
        <ProfileView user={user} onLogout={logout} canModerate={canModerate} streetId={STREET_ID}
          streetName={streetInfo?.name} memberCount={streetInfo?.members || 0} households={streetInfo?.households || 0} onError={showError} />
      )}

      <div style={s.bottomBar}>
        <div style={s.tabBar}>
          {[
            { id: 'feed', label: t('feed'), icon: HouseIcon },
            { id: 'hof', label: t('hall_of_fame_title'), icon: TrophyIcon },
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
          <PlusIcon size={22} style={{ flexShrink: 0 }} />
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
          streetId={STREET_ID} user={user} initialCat={pendingCat} initialType={pendingType} onError={showError} />
      )}
      {showNotifInbox && (
        <NotificationInboxSheet
          onClose={() => { setShowNotifInbox(false); setUnreadCount(0); }}
          onOpenPost={(postId) => handleDeepLink(`/?post=${postId}`)}
          onError={showError}
        />
      )}
      {eventDetail && (
        <EventDetailSheet post={eventDetail} onClose={() => setEventDetail(null)} onRsvp={handleRsvp} />
      )}
      {joinDetail && (
        <JoinDetailSheet post={joinDetail} onClose={() => setJoinDetail(null)} onJoin={handleJoin} />
      )}
      {editPost && (
        <EditPostSheet post={editPost} onClose={() => setEditPost(null)} onSave={handleEdit} streetId={STREET_ID} onError={showError} user={user} />
      )}
      {deleteConfirm && (
        <ConfirmationSheet
          heading={t('delete_post_heading')}
          body={t('delete_post_body')}
          primaryLabel={t('delete_post_confirm')}
          onPrimary={handleDeleteConfirmed}
          secondaryLabel={t('cancel')}
          onSecondary={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
