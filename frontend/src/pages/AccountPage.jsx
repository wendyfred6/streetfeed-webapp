import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { t, getLang, setLang } from '../i18n/index.js';
import { usePush, notifSupported } from '../hooks/usePush.jsx';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { CATEGORIES, catLabel } from '../utils/categories.js';
import { timeAgo } from '../utils/time.js';
import Switch from '../components/Switch.jsx';
import LegalContent from '../components/LegalContent.jsx';
import { ChevronDownIcon, CrossIcon } from '../icons/index.jsx';

// Figma "Account - Resident View" (node 466:3287, updated 2026-07-25) only
// shows these five categories — Melding/Report is excluded here too,
// matching CategoryPicker (it's no longer creatable in Pilot v1) — not the
// full CATEGORIES object, which still carries `melding` for legacy post
// rendering.
const NOTIF_CATEGORIES = ['bezorging', 'straatzaken', 'lostandfound', 'evenement', 'algemeen'];

// Solid white cards (no frosted-glass blur), 20px radius / 16px padding, one
// 20px gap between every section — Figma's "Account contents" frame. Every
// section's own visible heading (or lack of one) also comes straight from
// Figma: its per-section micro-labels (PROFIEL, JOUW STRAAT, etc.) are all
// hidden layers there, not rendered UI — the only in-card titles that
// actually show are the street name and "Notificatie-instellingen".
const page = { display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 20px calc(98px + env(safe-area-inset-bottom))' };
// No baked-in gap — Profiel's name/address/email stack tightly (0 gap in
// Figma), while Jouw straat/Notificatie/Voorwaarden each add their own
// `gap: 12` at the call site, matching Figma's per-card spacing exactly.
const card = { background: '#fff', borderRadius: RADIUS.lg, padding: 16, display: 'flex', flexDirection: 'column' };
const divider = { height: 0, borderTop: '1px solid rgba(28,26,24,0.08)', width: '100%', flexShrink: 0 };
const rowLabel = { flex: 1, fontSize: 16, lineHeight: '24px', color: COLORS.text };
const cardHeading = { fontSize: 16, fontWeight: 700, lineHeight: '20px', color: COLORS.text };
// Pink-tinted stat boxes for "Jouw straat" — distinct from the shared
// s.statCard (AdminView's own queue-tab stats, left untouched below).
const statBox = { flex: 1, background: 'rgba(255,0,102,0.05)', borderRadius: 12, padding: 16, textAlign: 'center' };
const statNum = { fontSize: 20, fontWeight: 700, lineHeight: '24px', color: COLORS.text };
const statLabel = { fontSize: 14, lineHeight: '20px', color: COLORS.text };

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
// Unchanged from the old Profile page's admin section (moved, not modified)
// — Wendy's explicit instruction (2026-07-24): keep this legacy section
// exactly as it works today, appended at the bottom of the new Account page,
// as a migration safety net until the real Administration page (FRE-391)
// has been designed, implemented, and validated (see FRE-405).
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
                  <button style={{ flex: 1, background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => approve(p.id)}>{t('approve')}</button>
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

// ─── ACCOUNT PAGE ───────────────────────────────────────────────────────────────
// Figma "Account - Resident View" (node 466:3287) is the source of truth for
// every resident-facing section below. Admin functionality is deliberately
// NOT part of that design — see AdminView above and FRE-405/FRE-391.
export default function AccountPage({ user, onLogout, canModerate, streetId, streetName, memberCount, households, onError }) {
  const [lang, setLangState] = useState(getLang());
  const [notifs, setNotifs] = useState({});
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const [legalOpen, setLegalOpen] = useState(null); // null | 'terms' | 'privacy'
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

  const toggleLegal = (key) => setLegalOpen(open => open === key ? null : key);

  return (
    <div style={page}>
      {/* Profiel — no avatar: Figma's placeholder-photo frame is hidden in
          the design (FRE-401 leaves avatar upload out of scope entirely). */}
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 20, lineHeight: '24px', color: COLORS.text }}>{user.name}</div>
        <div style={{ fontSize: 14, lineHeight: '20px', color: COLORS.text }}>
          {(user.house_number && streetName) ? t('profile_address_value', { street: streetName, number: user.house_number }) : (user.house_number || '–')}
        </div>
        <div style={{ fontSize: 14, lineHeight: '20px', color: COLORS.text }}>{user.email}</div>
      </div>

      {/* Jouw straat */}
      <div style={{ ...card, gap: 12 }}>
        <div style={cardHeading}>{streetName || '–'}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={statBox}>
            <div style={statNum}>{households}</div>
            <div style={statLabel}>{t('account_stat_addresses')}</div>
          </div>
          <div style={statBox}>
            <div style={statNum}>{memberCount}</div>
            <div style={statLabel}>{t('account_stat_residents')}</div>
          </div>
        </div>
      </div>

      {/* Notificatie-instellingen */}
      <div style={{ ...card, gap: 12 }}>
        <div style={cardHeading}>{t('account_notif_section')}</div>
        {isIOS && !subscribed && (
          <div style={{ fontSize: 16, lineHeight: '24px', color: COLORS.text }}>{t('pwa_ios_hint')}</div>
        )}
        <div style={divider} />
        {notifSupported && !subscribed && permission !== 'denied' && (
          <>
            <button style={s.submitBtn} onClick={async () => {
              const result = await subscribe();
              setSubscribeMsg(result.ok ? t('notifications_enabled_toast') : (result.error || ''));
            }}>{t('enable_notifications')}</button>
            {subscribeMsg && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                <span>{subscribeMsg}</span>
                <button onClick={() => setSubscribeMsg('')} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: COLORS.textDim, flexShrink: 0 }} aria-label={t('close')}>
                  <CrossIcon size={14} />
                </button>
              </div>
            )}
            <div style={divider} />
          </>
        )}
        {NOTIF_CATEGORIES.map((key, i) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={rowLabel}>{catLabel(key)}</span>
              <Switch size="md" checked={!!notifs[key]} onChange={() => toggleNotif(key)} label={catLabel(key)}
                trackOnColor={COLORS.success} trackOffColor={COLORS.textDim} knobOnColor="#fff" knobOffColor="#fff" />
            </div>
            {i < NOTIF_CATEGORIES.length - 1 && <div style={{ ...divider, marginTop: 12 }} />}
          </div>
        ))}
      </div>

      {/* Taal / Language */}
      <div style={{ background: 'rgba(108,104,96,0.05)', opacity: 0.8, borderRadius: RADIUS.pill, padding: 4, display: 'flex', boxSizing: 'border-box' }}>
        {[['nl', 'Nederlands'], ['en', 'English']].map(([code, label]) => {
          const active = lang === code;
          return (
            <button key={code} type="button" aria-pressed={active} onClick={() => switchLang(code)}
              style={{
                flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.pill, boxSizing: 'border-box',
                background: active ? '#fff' : 'transparent',
                border: active ? `1px solid ${COLORS.textMuted}` : '1px solid transparent',
                color: active ? COLORS.text : COLORS.textMuted,
                fontSize: 14, lineHeight: '20px', fontWeight: 400, cursor: 'pointer',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Voorwaarden / Privacy & Data */}
      <div style={{ ...card, gap: 12 }}>
        <button type="button" onClick={() => toggleLegal('terms')} aria-expanded={legalOpen === 'terms'}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
          <span style={rowLabel}>{t('terms_title')}</span>
          <ChevronDownIcon size={24} color={COLORS.text} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: legalOpen === 'terms' ? 'rotate(180deg)' : 'none' }} />
        </button>
        {legalOpen === 'terms' && <div><LegalContent introKey="terms_intro" sectionsKey="terms_sections" /></div>}
        <div style={divider} />
        <button type="button" onClick={() => toggleLegal('privacy')} aria-expanded={legalOpen === 'privacy'}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
          <span style={rowLabel}>{t('privacy_title')}</span>
          <ChevronDownIcon size={24} color={COLORS.text} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: legalOpen === 'privacy' ? 'rotate(180deg)' : 'none' }} />
        </button>
        {legalOpen === 'privacy' && <div><LegalContent introKey="privacy_intro" sectionsKey="privacy_sections" contactCtaKey="privacy_contact_cta" streetName={streetName} /></div>}
      </div>

      {/* Admin Tools — Figma's Resident View has no Admin section at all;
          this is the one part of the page that isn't Figma-specified, kept
          exactly as it already worked (FRE-405/FRE-391), just relocated here
          per the shared-layout requirement instead of living after Logout. */}
      {canModerate && (
        <>
          <div style={s.sectionLabel}>{t('admin')}</div>
          <AdminView streetId={streetId} user={user} memberCount={memberCount} households={households} onError={onError} />
        </>
      )}

      <button style={s.cancelBtn} onClick={onLogout}>{t('logout')}</button>
    </div>
  );
}
