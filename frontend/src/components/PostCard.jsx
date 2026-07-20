import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { api } from '../api/client.js';
import { t } from '../i18n/index.js';
import { COLORS, RADIUS, GLASS } from '../design/tokens.js';
import { catLabel } from '../utils/categories.js';
import { timeAgo } from '../utils/time.js';
import { formatEventDate } from '../utils/eventDate.js';
import Switch from './Switch.jsx';
import Chevron from './Chevron.jsx';

import { HeartIcon } from '@phosphor-icons/react/dist/csr/Heart';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt';

// ─── STYLES (local to PostCard) ────────────────────────────────────────────────

const s = {
  card: (pinned) => ({ margin: '0 12px 8px', ...GLASS.card, background: pinned ? COLORS.pinned : 'rgba(255,255,255,0.70)', border: `1px solid ${pinned ? COLORS.pinnedBorder : 'rgba(255,255,255,0.50)'}`, borderRadius: RADIUS.lg, padding: '12px 14px' }),
  // PostBody (Figma node 23:7345): 14px Regular text/secondary, with the
  // "Text length indicator" left bar confirmed as a real, shared component
  // element (not a one-off in that specific mockup).
  cardBody: { fontSize: 14, color: COLORS.textMuted, lineHeight: '20px', paddingLeft: 12, borderLeft: `2px solid ${COLORS.accent}`, marginBottom: 10 },
  infoBox: { ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 10 },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 11, fontWeight: 700, padding: '2px 7px' }),
};

// ─── RSVP BAR ──────────────────────────────────────────────────────────────────

function AttendanceToggle({ post, onRsvp }) {
  const attending = post.my_rsvp === 'yes';
  const toggle = e => { e.stopPropagation(); onRsvp(post.id, 'yes'); };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <Switch checked={attending} onChange={toggle} label="Ik ben erbij" size="lg"
          trackOnColor={COLORS.green} trackOffColor="rgba(0,0,0,0.15)" knobOnColor="#fff" knobOffColor="#fff" knobShadow />
        <span onClick={toggle} style={{ fontSize: 14, fontWeight: attending ? 700 : 400, color: attending ? COLORS.text : COLORS.textMuted, cursor: 'pointer' }}>Ik ben erbij</span>
      </div>
    </div>
  );
}

// URLs are genuinely Amsterdam/Dutch-specific government services (meldingen.amsterdam.nl,
// politie.nl, svn.nl, the national police non-emergency line) — correct as-is for this
// pilot's only street/city. Labels are translated via t(), but the underlying URLs would
// need a real per-city lookup (streets.city already exists in the schema) before this could
// support a second city; not worth building for zero additional cities today (FRE-339).
function meldingLinks() {
  return {
    overlast: [{ label: t('melding_link_overlast'), url: 'https://meldingen.amsterdam.nl/', color: COLORS.blue }],
    schade: [
      { label: t('melding_link_aangifte'), url: 'https://www.politie.nl/aangifte-of-melding-doen', color: COLORS.error },
      { label: t('melding_link_waarborgfonds'), url: 'https://www.svn.nl/', color: COLORS.blue },
    ],
    verdacht: [
      { label: t('melding_link_politie_bel'), url: 'tel:09008844', color: COLORS.error },
      { label: t('melding_link_meldmisdaad'), url: 'https://www.meldmisdaadanoniem.nl', color: COLORS.blue },
    ],
  };
}

function MeldingLinks({ post }) {
  const links = meldingLinks()[post.sub_type] || [];
  if (!links.length) return null;
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {links.map(({ label, url, color }) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', border: `1px solid ${color}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color, textDecoration: 'none' }}>
          {label} →
        </a>
      ))}
    </div>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────────

export default function PostCard({ post, onLike, onRsvp, onOpenEvent, onReport, onOpenJoin, onDelete, canModerate, onEdit, canEdit, autoExpand, onError }) {
  const [expanded, setExpanded] = useState(false);
  const [threadComments, setThreadComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (autoExpand) setExpanded(true);
  }, [autoExpand]);

  useEffect(() => {
    if (expanded && threadComments === null) {
      api.get(`/streets/1/posts/${post.id}/comments`)
        .then(data => setThreadComments(data))
        .catch(err => {
          setThreadComments([]);
          onError?.(err.message || 'Reacties laden mislukt');
        });
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
    } catch (err) {
      onError?.(err.message || 'Reactie versturen mislukt');
    }
    setSendingComment(false);
  };

  const toggleExpanded = () => setExpanded(e => !e);
  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded();
    }
  };

  const commentCount = parseInt(post.comments) || 0;
  const isEvent        = post.category === 'evenement' || post.category === 'event';
  const isIncident     = post.category === 'melding'   || post.category === 'incident';
  const isPackage      = post.category === 'bezorging' || post.category === 'package';
  const isWorks        = post.category === 'straatzaken' || post.category === 'works' || ['blockage', 'container'].includes(post.category);
  const isLostAndFound = post.category === 'lostandfound';

  // FRE-265: datum-badge logica (Straatzaken's date/time range)
  const getDateLabel = () => {
    if (isWorks) {
      const fmt = (d) => {
        const [y, m, day] = d.substring(0, 10).split('-');
        return new Date(+y, +m - 1, +day).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      };
      const timePart = post.start_time || post.end_time
        ? ` · ${post.start_time || '?'}–${post.end_time || '?'}`
        : '';
      if (post.start_date && post.end_date) return `${fmt(post.start_date)} – ${fmt(post.end_date)}${timePart}`;
      if (post.start_date) return `${fmt(post.start_date)}${timePart}`;
      if (post.end_date) return `t/m ${fmt(post.end_date)}${timePart}`;
      if (timePart) return timePart.replace(' · ', '');
    }
    return null;
  };
  const dateLabel = getDateLabel();

  // Pinned Badge (Figma "Collapsed/Expanded, Type=Pinned", node 107:2189):
  // an accent pill next to the title, not a bordered text box — Straatzaken's
  // date/time range and Evenement's date/time render here instead of as
  // boxed body text. Date + time only inside the pill — attendee count sits
  // beside it in the same row as plain text, not inside the badge (confirmed
  // against Figma's "Completed New Post — Evenement" screen, 2026-07-19).
  // Always rendered when the data is present (not gated on post.pinned
  // specifically) since both categories auto-pin whenever they have a date
  // in the first place (backend autoPin logic) — the two conditions coincide
  // in practice.
  const attendeeCount = (post.rsvp?.yes || []).length;
  const badgeSegments = isWorks && dateLabel
    ? [dateLabel]
    : isEvent && post.event_date
      ? [formatEventDate(post.event_date), post.event_time].filter(Boolean)
      : null;

  // Lost & Found (Gevonden): pickup location is derived from the author's own
  // address, not a user-entered field — shown in the collapsed header
  // (always visible), not just when expanded.
  const pickupLocation = isLostAndFound && post.sub_type === 'gevonden' && post.author_house
    ? post.author_house
    : null;

  const firstName = (post.author_name || '').split(' ')[0] || t('resident');

  return (
    <div id={`post-${post.id}`} style={s.card(post.pinned)}>
      {/* ── Klikbare header (altijd zichtbaar) ── */}
      <div
        className="tap-feedback"
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggleExpanded}
        onKeyDown={handleHeaderKeyDown}
      >
        {/* ContextPath (own row, above the title): category only (Product Model
            v1, 2026-07-18) — Situation lives in the generated title instead,
            never in ContextPath. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textDim }}>
            {catLabel(post.category)}
          </div>
          <Chevron size={18} rotate={expanded ? 180 : 0} style={{ flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, letterSpacing: '0.016px', lineHeight: 'normal', marginTop: 4, marginBottom: 6 }}>
          {post.title}
        </div>
        {badgeSegments && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ background: COLORS.accent, display: 'inline-flex', alignItems: 'center', gap: 4, height: 16, padding: '4px', borderRadius: 4, width: 'fit-content' }}>
              {badgeSegments.map((seg, i) => (
                <span key={i} style={{ fontSize: 8, fontWeight: 500, color: COLORS.textInverse, whiteSpace: 'nowrap' }}>{seg}</span>
              ))}
            </div>
            {isEvent && attendeeCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap' }}>
                {attendeeCount} aanwezig
              </span>
            )}
          </div>
        )}
        {/* ContentMeta (altijd zichtbaar): voornaam · tijd · reacties */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: COLORS.textDim }}>
          <span>{firstName}{post.author_house ? ` ${post.author_house}` : ''}</span>
          <span>·</span><span>{timeAgo(post.created_at)}</span>
          {commentCount > 0 && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <ChatCircleIcon size={11} weight="regular" />
                {commentCount}
              </span>
            </>
          )}
        </div>
        {pickupLocation && (
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
            Ophaallocatie: {pickupLocation}
          </div>
        )}
      </div>

      {/* ── Uitgeklapte inhoud ── */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
          {post.body && <div style={s.cardBody}>{post.body}</div>}
          {/* Bezorging's recipient house number is already the point of the
              post (title/ContentMeta) — showing it again here as address
              info was explicitly flagged as wrong (2026-07-19 acceptance
              test). Melding's Van/Tot house range still uses this box. */}
          {!isPackage && (post.start_house || post.end_house) && (
            <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: COLORS.text }}>Nr. </span>
              {post.start_house}{post.end_house ? ` t/m ${post.end_house}` : ''}
            </div>
          )}
          {isEvent && post.event_date && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                <strong style={{ color: COLORS.text }}>Wanneer: </strong>
                {formatEventDate(post.event_date)}{post.event_time ? ` om ${post.event_time}` : ''}
              </div>
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
              <div style={{ fontSize: 12, color: COLORS.textDim, paddingBottom: 8 }}>{t('comments_loading')}</div>
            )}
            {(threadComments || []).map((c, i) => (
              <div key={c.id ?? i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 2 }}>
                  {(c.author_name || '').split(' ')[0] || t('resident')}{c.author_house ? ` ${c.author_house}` : ''}
                </div>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{c.body}</div>
              </div>
            ))}
            {threadComments !== null && (
              // Single pill field with an embedded send icon (Figma
              // CommentComposer, node 7:297) — not a separate input +
              // "Stuur" button (confirmed against Wendy's screenshot,
              // 2026-07-19).
              <div style={{ position: 'relative', marginTop: 4 }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(e); } }}
                  placeholder={t('comment_placeholder')}
                  style={{ width: '100%', height: 48, background: COLORS.background, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: 999, padding: '4px 48px 4px 16px', fontSize: 16, color: COLORS.text, outline: 'none', boxSizing: 'border-box' }}
                />
                <button onClick={submitComment} disabled={!commentText.trim() || sendingComment} aria-label={t('comment_send')}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, display: 'flex', cursor: commentText.trim() ? 'pointer' : 'default' }}>
                  <PaperPlaneTiltIcon size={24} weight="regular" color={commentText.trim() && !sendingComment ? COLORS.accent : COLORS.textDim} />
                </button>
              </div>
            )}
          </div>

          {/* ActionBar (Figma node 443:23582, updated 2026-07-19): fixed
              48px row, engagement actions (Like) left, owner actions
              (Edit/Delete) right — icons at 24px per the updated component.
              Edit/Delete are each a 40x40 tap target with a 16px gap between
              them (wider than Figma's literal 12px group gap, deliberately —
              per the explicit "prevent accidental taps" requirement) rather
              than icon-sized-only buttons sitting edge to edge. Delete stays
              visually neutral (textDim, same as Edit) even though it's
              destructive — actual confirmation happens through
              ConfirmationSheet (App.jsx's deleteConfirm), not through
              in-bar warning styling. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, marginTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: post.liked ? COLORS.interactionLike : COLORS.textDim }}
              onClick={e => { e.stopPropagation(); onLike(post.id); }}
              aria-label={t('like')}
            >
              <HeartIcon size={24} weight={post.liked ? 'fill' : 'regular'} style={{ display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: 16, color: COLORS.textMuted }}>{Number(post.likes)}</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {canEdit && (
                <button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: COLORS.textDim }}
                  onClick={e => { e.stopPropagation(); onEdit(post); }} title={t('edit')} aria-label={t('edit')}
                >
                  <PencilSimpleIcon size={24} weight="regular" />
                </button>
              )}
              {canEdit ? (
                <button
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: COLORS.textDim }}
                  onClick={e => { e.stopPropagation(); onDelete(post.id); }} title={t('delete')} aria-label={t('delete')}
                >
                  <TrashIcon size={24} weight="regular" />
                </button>
              ) : (
                <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, cursor: 'pointer', color: post.reported ? COLORS.error : COLORS.textDim }} onClick={e => { e.stopPropagation(); onReport(post.id); }} title={t('report')}>
                  {post.reported ? t('reported_label') : t('report')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
