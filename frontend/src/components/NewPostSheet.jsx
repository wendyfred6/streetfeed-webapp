import { useState } from 'react';
import { COLORS, RADIUS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import { catLabel, typeLabel } from '../utils/categories.js';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';
import { usePostFormState } from '../hooks/usePostFormState.js';
import PostFormFields from './PostFormFields.jsx';
import { ArrowCircleLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowCircleLeft';

export default function NewPostSheet({ onClose, onBack, onSubmit, streetId, user, initialCat = 'bezorging', initialType = null, onError }) {
  const form = usePostFormState();
  const { title, body, startHouse, endHouse, startDate, endDate, link, situatie, pickupLocation, eventDate, eventTime, photoKey, uploading } = form;
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  const back  = () => { setClosing(true); setTimeout(onBack,  220); };

  const { isBezorging, isStraatzaken, isMelding, isEvenement, isLostAndFound, isGezocht } = postCategoryFlags(initialCat, initialType);
  const isGevondenType = isLostAndFound && situatie === 'gevonden';

  const autoTitle = isGezocht
    ? (user?.house_number ? t('package_search_title_house', { houseNumber: user.house_number }) : t('package_search_title'))
    : startHouse.trim() ? t('package_delivered_title_house', { houseNumber: startHouse.trim() }) : '';

  // Straatzaken has no user-facing title field in create mode (FRE-375) —
  // auto-generate one from the chosen Situatie, same pattern as Bezorging's autoTitle above.
  const straatzakenAutoTitle = isStraatzaken ? typeLabel('straatzaken', situatie) : '';

  const canSubmit = !uploading && (isBezorging
    ? (isGezocht || !!startHouse.trim())
    : isMelding
      ? !!(title.trim() && body.trim())
      : isEvenement
        ? !!(title.trim() && eventDate)
        : isStraatzaken
          ? !!situatie
          : isLostAndFound
            ? !!(title.trim() && situatie && (!isGevondenType || pickupLocation.trim()))
            : !!title.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      category: initialCat,
      subType: (isStraatzaken || isLostAndFound) ? (situatie || undefined) : (initialType || undefined),
      title: isBezorging ? autoTitle : isStraatzaken ? straatzakenAutoTitle : title.trim(),
      body: body.trim() || undefined,
      startHouse: startHouse.trim() || undefined,
      endHouse: endHouse.trim() || undefined,
      startDate: isStraatzaken ? (startDate || undefined) : undefined,
      endDate: (isStraatzaken || isEvenement) ? (endDate || undefined) : undefined,
      link: isStraatzaken ? (link.trim() || undefined) : undefined,
      eventDate: isEvenement ? (eventDate || undefined) : undefined,
      eventTime: isEvenement ? (eventTime || undefined) : undefined,
      pickupLocation: isGevondenType ? (pickupLocation.trim() || undefined) : undefined,
      photoKey: photoKey || undefined,
    });
    close();
  };

  const heading      = initialType ? typeLabel(initialCat, initialType) : catLabel(initialCat);
  const categoryPath = initialType ? catLabel(initialCat) : null;

  // Per-category descriptive sentence under the heading, matching every
  // Figma New Post Sheet mockup (FRE-377). Melding has no Figma mockup at
  // all (postponed from Pilot v1 scope) and no intro text either.
  const introText = isMelding
    ? null
    : isEvenement
      ? 'Welk evenement wil je met je buren delen?'
      : isStraatzaken
        ? 'Informeer je buren over tijdelijke situaties in de straat.'
        : isLostAndFound
          ? 'Meld een verloren of gevonden voorwerp.'
          : isBezorging
            ? (isGezocht ? 'Heeft iemand mijn pakket aangenomen?' : 'Voor welk huisnummer is het pakket bedoeld?')
            : 'Heb je iets te koop, gratis aan te bieden, wil je iets van je buur lenen of heb je een andere algemene vraag?';

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
            <button onClick={back} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }} aria-label={t('back')}>
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

        {introText && (
          <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 16, flexShrink: 0 }}>
            {introText}
          </div>
        )}

        {/* Scrollbaar formuliergebied */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 4 }}>
          <PostFormFields mode="create" category={initialCat} subType={initialType} form={form} streetId={streetId} user={user} onError={onError} />
        </div>

        {/* Vaste CTA's */}
        <div style={{ flexShrink: 0 }}>
          <button
            style={{ width: '100%', height: 48, background: COLORS.accent, color: COLORS.textInverse, border: 'none', borderRadius: RADIUS.pill, padding: '4px 16px', fontSize: 16, fontWeight: 500, cursor: canSubmit ? 'pointer' : 'not-allowed', marginTop: 16, opacity: canSubmit ? 1 : 0.35 }}
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
