import { useState, useRef } from 'react';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import { catLabel, typeLabel } from '../utils/categories.js';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';
import { usePostFormState } from '../hooks/usePostFormState.js';
import PostFormFields from './PostFormFields.jsx';
import ConfirmationSheet from './ConfirmationSheet.jsx';
import { ArrowCircleLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowCircleLeft';
import { CrossIcon } from '../icons/index.jsx';

const toDateInput = (d) => d ? d.substring(0, 10) : '';

// Lost & Found's stored title is the fully generated string ("Verloren -
// {object}"/"Gevonden - {object}"), but the object-description field only
// ever holds the bare object text — strip the prefix back off when entering
// edit mode, otherwise the field shows the redundant prefix baked in, and
// re-saving after a Situatie change would double-prefix it (2026-07-19,
// found while verifying the generated-title rule against Figma's Edit Post
// Flow).
const stripLostAndFoundPrefix = (title) => title.replace(/^(Verloren|Gevonden) - /, '');

// Shared modal chrome for both creating and editing a post (2026-07-19) —
// previously EditPostSheet used a completely different bottom-sheet wrapper
// (SheetOverlay), which turned out not to match anything in Figma's Pattern
// Library (only one "Modal" component/variant exists there, the centered
// card this component already used for creation). Passing `post` switches
// this into edit mode: same fields, same chrome, same generated-vs-user-
// created title rules (Figma's "Edit Post Flow v0.1") — the header's category
// label is joined by a clickable Cross (Figma's "Confirmation Patterns v0.1",
// which shows the same header slot using X as a real close action, not
// Edit Post Flow's earlier decorative Pencil) and the CTA reads "Wijzigingen
// opslaan". Edit mode has exactly one exit action — the Cross — no Annuleren:
// every Edit Post mockup on both Figma pages shows only the primary CTA
// under the form, confirmed 2026-07-19 after Wendy flagged having both was
// redundant. Any edit-mode dismissal (Cross, tap-outside) is guarded by a
// dirty check: if the form differs from what it was pre-filled with, a
// ConfirmationSheet ("Unsaved Changes" variant) is shown on top before
// actually closing, instead of silently discarding edits. Create mode keeps
// its own back arrow + Annuleren (no header close action to consolidate) and
// is never dirty, so the guard is a no-op there. EditPostSheet.jsx is a thin
// adapter over this.
export default function NewPostSheet({ onClose, onBack, onSubmit, streetId, user, initialCat = 'bezorging', initialType = null, onError, post = null }) {
  const isEdit = !!post;
  const initialValues = isEdit ? {
    title: post.category === 'lostandfound' ? stripLostAndFoundPrefix(post.title) : post.title,
    body: post.body || '',
    startHouse: post.start_house || '',
    endHouse: post.end_house || '',
    startDate: toDateInput(post.start_date),
    endDate: toDateInput(post.end_date),
    eventDate: post.event_date || '',
    eventTime: post.event_time || '',
    link: post.link || '',
    situatie: post.sub_type || '',
    photoPreview: post.photo_url || null,
    photoKey: post.photo_key || null,
  } : undefined;
  const form = usePostFormState(initialValues);
  const { title, body, startHouse, endHouse, startDate, endDate, link, situatie, eventDate, eventTime, photoKey, uploading } = form;
  const [closing, setClosing] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  const back  = () => { setClosing(true); setTimeout(onBack,  220); };

  // Snapshot taken once, at mount, of the exact fields the dirty check
  // compares against — only meaningful in edit mode (null in create mode).
  const initialSnapshot = useRef(isEdit ? JSON.stringify({
    title: initialValues.title, body: initialValues.body,
    startHouse: initialValues.startHouse, endHouse: initialValues.endHouse,
    startDate: initialValues.startDate, endDate: initialValues.endDate,
    eventDate: initialValues.eventDate, eventTime: initialValues.eventTime,
    link: initialValues.link, situatie: initialValues.situatie,
    photoKey: initialValues.photoKey || '',
  }) : null);
  const isDirty = isEdit && initialSnapshot.current !== JSON.stringify({
    title, body, startHouse, endHouse, startDate, endDate,
    eventDate, eventTime, link, situatie, photoKey: photoKey || '',
  });
  const requestClose = () => {
    if (isDirty) { setShowUnsavedConfirm(true); return; }
    close();
  };

  const category = isEdit ? post.category : initialCat;

  // `initialType` only arrives non-null from a CategoryPicker drill-down
  // (still possible for out-of-scope legacy categories); Bezorging's own
  // Situatie is now an in-post choice like Straatzaken/Lost & Found, so this
  // has to fall back to the `situatie` state instead. Algemeen has no
  // Situatie at all (confirmed against Figma, 2026-07-18).
  const { isBezorging, isStraatzaken, isMelding, isEvenement, isLostAndFound, isGezocht } = postCategoryFlags(category, initialType || situatie);

  const autoTitle = isGezocht
    ? (user?.house_number ? t('package_search_title_house', { houseNumber: user.house_number }) : t('package_search_title'))
    : startHouse.trim() ? t('package_delivered_title_house', { houseNumber: startHouse.trim() }) : '';

  // Straatzaken has no user-facing title field in create mode (FRE-375) —
  // auto-generate one from the chosen Situatie, same pattern as Bezorging's autoTitle above.
  const straatzakenAutoTitle = isStraatzaken ? typeLabel('straatzaken', situatie) : '';

  // Lost & Found: the "Wat ben je verloren/heb je gevonden?" field (`title`
  // state) captures the object description, not the post title — the actual
  // title is generated from Situation + fixed copy + user input
  // ("Verloren - {object}"/"Gevonden - {object}"), per the Pilot v1 Product
  // Model (2026-07-18): ContextPath is category-only, so Situation has to
  // live in the generated title instead.
  const lostAndFoundAutoTitle = isLostAndFound
    ? `${situatie === 'gevonden' ? 'Gevonden' : 'Verloren'} - ${title.trim()}`
    : '';

  // Same validation and title-generation rules in both modes now (2026-07-19,
  // confirmed against Figma's "Edit Post Flow v0.1": generated fields — the
  // ones that drive Bezorging/Straatzaken/Lost & Found's title — are never
  // shown as a separate title field, in create OR edit, so the title always
  // has to come from generation for those categories. User-created titles
  // (Melding/Evenement/Algemeen) are directly editable in both modes too.
  const canSubmit = !uploading && (isBezorging
    ? !!situatie && (isGezocht || !!startHouse.trim())
    : isMelding
      ? !!(title.trim() && body.trim())
      : isEvenement
        ? !!(title.trim() && eventDate)
        : isStraatzaken
          ? !!situatie
          : isLostAndFound
            ? !!(title.trim() && situatie)
            : !!title.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      subType: (isBezorging || isStraatzaken || isLostAndFound) ? (situatie || undefined) : (initialType || undefined),
      title: isBezorging ? autoTitle : isStraatzaken ? straatzakenAutoTitle : isLostAndFound ? lostAndFoundAutoTitle : title.trim(),
      // Edit sends body raw (not `|| undefined`) so clearing it to empty
      // actually clears it — matching the old EditPostSheet's behaviour,
      // since backend PATCH treats `undefined` as "no change".
      body: isEdit ? body.trim() : (body.trim() || undefined),
      startHouse: startHouse.trim() || undefined,
      endHouse: endHouse.trim() || undefined,
      startDate: isStraatzaken ? (startDate || undefined) : undefined,
      endDate: (isStraatzaken || isEvenement) ? (endDate || undefined) : undefined,
      link: isStraatzaken ? (link.trim() || undefined) : undefined,
      eventDate: isEvenement ? (eventDate || undefined) : undefined,
      eventTime: isEvenement ? (eventTime || undefined) : undefined,
      // Edit always sends photoKey explicitly (even '') so removing an
      // existing photo actually clears it instead of being read as "no
      // change" — it's pre-filled from post.photo_key so an untouched
      // attachment just resubmits its own current value.
      photoKey: isEdit ? (photoKey || '') : (photoKey || undefined),
    };
    onSubmit(isEdit ? payload : { category, ...payload });
    close();
  };

  const heading      = initialType ? typeLabel(initialCat, initialType) : catLabel(category);
  const categoryPath = initialType ? catLabel(initialCat) : null;

  // Per-category descriptive sentence under the heading, confirmed directly
  // against every Figma New Post Sheet mockup (2026-07-18 audit). Melding has
  // no Figma mockup at all (postponed from Pilot v1 scope) and no intro text
  // either. Bezorging's text is static regardless of Situatie — it previously
  // varied by isGezocht, which Figma doesn't do.
  const introText = isMelding
    ? null
    : isEvenement
      ? 'Welk evenement wil je met je buren delen?'
      : isStraatzaken
        ? 'Informeer je buren over tijdelijke situaties in de straat.'
        : isLostAndFound
          ? 'Meld een verloren of gevonden voorwerp.'
          : isBezorging
            ? 'Een pakket aangenomen voor een buur of op zoek naar je pakket?'
            : 'Heb je iets te koop, gratis aan te bieden, wil je iets van je buur lenen, wil je een aanbeveling doen of heb je een andere algemene vraag?';

  return (
    <>
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
      onClick={requestClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 350,
          background: COLORS.surfaceModal,
          borderRadius: RADIUS.xl,
          padding: '28px 20px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          animation: `${closing ? 'modalOut 0.22s ease-in' : 'modalIn 0.28s cubic-bezier(0.34,1.2,0.64,1)'} forwards`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — edit mode's exit action is the Cross, per Figma's
            "Confirmation Patterns v0.1" (2026-07-19), which supersedes Edit
            Post Flow v0.1's earlier decorative-Pencil header for this same
            slot. Routes through requestClose so unsaved edits are guarded. */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isEdit && (
              <button onClick={back} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label={t('back')}>
                <ArrowCircleLeftIcon size={40} weight="regular" color={COLORS.text} />
              </button>
            )}
            <div style={{ flex: 1 }}>
              {categoryPath && (
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
                  {categoryPath}
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{heading}</div>
            </div>
            {isEdit && (
              <button onClick={requestClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label={t('close')}>
                <CrossIcon size={20} color={COLORS.textDim} />
              </button>
            )}
          </div>
        </div>

        {introText && (
          <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 16, flexShrink: 0 }}>
            {introText}
          </div>
        )}

        {/* Scrollbaar formuliergebied */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 4 }}>
          <PostFormFields mode={isEdit ? 'edit' : 'create'} category={category} subType={initialType || situatie} form={form} streetId={streetId} user={user} onError={onError} />
        </div>

        {/* Vaste CTA's */}
        <div style={{ flexShrink: 0 }}>
          <button
            style={{ width: '100%', height: 48, background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'not-allowed', marginTop: 16, opacity: canSubmit ? 1 : 0.35 }}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isEdit ? t('save_changes') : t('publish')}
          </button>
          {/* Edit mode has one exit action only (the header Cross) — Figma's
              "Edit Post Flow v0.1" and "Confirmation Patterns v0.1" both
              show no secondary Annuleren button under "Wijzigingen opslaan"
              in any Edit Post mockup, confirmed 2026-07-19. Create mode keeps
              Annuleren since it has no header close action to begin with. */}
          {!isEdit && (
            <button style={{ ...s.cancelBtn, marginTop: 8 }} onClick={close}>{t('cancel')}</button>
          )}
        </div>
      </div>
    </div>
    {showUnsavedConfirm && (
      <ConfirmationSheet
        heading={t('unsaved_changes_heading')}
        body={t('unsaved_changes_body')}
        primaryLabel={t('keep_editing')}
        onPrimary={() => setShowUnsavedConfirm(false)}
        secondaryLabel={t('discard_changes')}
        onSecondary={() => { setShowUnsavedConfirm(false); close(); }}
      />
    )}
    </>
  );
}
