import { COLORS, RADIUS } from '../design/tokens.js';
import { FIELD_INPUT } from '../design/fieldStyles.js';
import { t } from '../i18n/index.js';
import HouseNumberPicker from './HouseNumberPicker.jsx';
import AutoTextarea from './AutoTextarea.jsx';
import AttachmentUpload from './AttachmentUpload.jsx';
import { FieldLabel, TextField, DateField, DropdownField } from './PostFormField.jsx';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';
import { BEZORGING_TYPES, STRAATZAKEN_TYPES, LOSTANDFOUND_TYPES } from '../utils/categories.js';

// Shared field-rendering schema for NewPostSheet (mode="create") and
// EditPostSheet (mode="edit") — previously each component duplicated almost
// this entire field set independently (FRE-316). Both modes now render the
// exact same per-category field set (confirmed against Figma's "Edit Post
// Flow v0.1", 2026-07-19: "same structure as New Post Sheet" for both, field
// behaviour differs only by whether a field is generated or user-created).
// Categories whose title is generated (Bezorging, Straatzaken) never render
// a title field in either mode — it isn't hidden-then-shown on edit, it's
// just never one of this category's fields. Categories whose title is
// user-created (Melding, Evenement, Algemeen, Lost & Found's object
// description) render it, tailored label/placeholder and all, in both modes
// too. Only small cosmetic differences (spacing, textarea min-height, the
// title field's `placeholder` — a create-only affordance since edit always
// has a real value) are still branched on `isCreate`.
export default function PostFormFields({ mode, category, subType, form, streetId, user, onError }) {
  const isCreate = mode === 'create';
  const {
    title, setTitle, body, setBody,
    startHouse, setStartHouse, endHouse, setEndHouse,
    startDate, setStartDate, endDate, setEndDate,
    link, setLink, situatie, setSituatie, eventDate, setEventDate, eventTime, setEventTime,
    photoPreview, setPhotoPreview, setPhotoKey, uploading, setUploading,
  } = form;

  const { isBezorging, isStraatzaken, isMelding, isEvenement, isAlgemeen, isLostAndFound, isGezocht, isBezorgd, hasDateRange, hasLink, hasAttachment } =
    postCategoryFlags(category, subType);

  // Per-category Attachment Upload helper copy (Figma New Post Sheet
  // mockups) — undefined for categories without confirmed copy yet;
  // AttachmentUpload renders nothing extra when omitted.
  const attachmentHelperText = isBezorging
    ? 'Een foto helpt de ontvanger te bevestigen dat het om zijn/haar pakket gaat.'
    : isLostAndFound
      ? 'Deel een foto van het verloren (indien aanwezig) of gevonden voorwerp.'
      : isEvenement
        ? 'Upload eventueel een foto van de uitnodiging.'
        : undefined;

  const autoTitle = isGezocht
    ? (user?.house_number ? `Pakket gezocht voor nr. ${user.house_number}` : 'Pakket gezocht')
    : startHouse.trim() ? `Pakket aangenomen voor nr. ${startHouse.trim()}` : '';

  const singleHouseField = (
    <>
      <HouseNumberPicker
        streetId={streetId} value={startHouse} onChange={setStartHouse}
        showLabels
        numberLabel="Voor huisnummer"
        suffixLabel="Toevoeging"
        style={{ marginBottom: isCreate ? 10 : 14 }}
      />
      {autoTitle && <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 12 }}>Titel: <em>{autoTitle}</em></div>}
    </>
  );

  const gezochtInfo = isGezocht && (
    <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
      Je eigen huisnummer staat al bij je bericht — daar hoef je niets voor in te vullen.
    </div>
  );

  const houseRow = !isBezorging && !isAlgemeen && !isLostAndFound && !isStraatzaken && !isEvenement && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      <div>
        <FieldLabel>Van nr.</FieldLabel>
        <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} showSuffix={false} />
      </div>
      <div>
        <FieldLabel>Tot nr.</FieldLabel>
        <HouseNumberPicker streetId={streetId} value={endHouse} onChange={setEndHouse} showSuffix={false} />
      </div>
    </div>
  );

  const dateTimeRange = hasDateRange && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCreate ? 10 : 16, marginBottom: isCreate ? 14 : undefined }}>
      <DateField type="date" label="Datum van" value={startDate} onChange={e => setStartDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
      <DateField type="date" label="Datum tot" value={endDate} onChange={e => setEndDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
    </div>
  );

  const eventFields = isEvenement && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: isCreate ? 14 : undefined }}>
      <DateField type="date" label={isCreate ? 'Datum' : t('event_date')} value={eventDate} onChange={e => setEventDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
      <DateField type="time" label={isCreate ? 'Tijd' : t('event_time')} value={eventTime} onChange={e => setEventTime(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
    </div>
  );

  // Bezorging's Pakket aangenomen/gezocht, Straatzaken's Type-hinder (FRE-367),
  // and Lost & Found's Verloren/Gevonden (FRE-368) are all an in-post
  // "Situatie" choice, not a CategoryPicker drill-down — same field,
  // different option list per category. Algemeen does NOT get one — checked
  // directly against Figma (2026-07-18), which shows Algemeen going straight
  // from Titel to Details with no Situatie field at all; it's a genuinely
  // situation-less category, not just an oversight from folding it into this
  // pattern by analogy with the others.
  const situatieOptions = isBezorging ? BEZORGING_TYPES : isStraatzaken ? STRAATZAKEN_TYPES : isLostAndFound ? LOSTANDFOUND_TYPES : null;
  const situatieField = situatieOptions && (
    <DropdownField
      label="Situatie"
      placeholder="Kies een type"
      value={situatie}
      onChange={e => setSituatie(e.target.value)}
      wrapperStyle={{ marginBottom: isCreate ? 10 : 14 }}
    >
      {situatieOptions.map(ty => <option key={ty.key} value={ty.key}>{ty.label}</option>)}
    </DropdownField>
  );

  const linkField = hasLink && (
    <TextField type={isCreate ? 'url' : undefined} label={isCreate ? 'Link' : 'Externe link'} placeholder={isCreate ? 'https://…' : 'https://...'} value={link} onChange={e => setLink(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  // Lost & Found's object-description label/placeholder is tailored per
  // Situatie (confirmed against Wendy's Verloren/Gevonden screenshots,
  // 2026-07-17) — this field feeds the generated title ("Verloren -
  // {object}"/"Gevonden - {object}", NewPostSheet.jsx), it isn't the title
  // itself. Falls back to the neutral combined question before Situatie is
  // chosen.
  const createTitleLabel = isMelding
    ? 'Onderwerp'
    : isEvenement
      ? 'Evenement'
      : isLostAndFound
        ? (situatie === 'verloren' ? 'Wat ben je verloren?' : situatie === 'gevonden' ? 'Wat heb je gevonden?' : 'Wat ben je verloren of heb je gevonden?')
        : 'Titel';
  const createTitlePlaceholder = isMelding
    ? 'Kort en duidelijk'
    : isEvenement
      ? 'Bijv. Straatborrel Kerst'
      : isLostAndFound
        ? (situatie === 'verloren' ? 'Sleutelbos met rood label' : situatie === 'gevonden' ? 'Zwarte lederen handschoen' : 'Bijv. Verloren of gevonden voorwerp')
        : 'Bijv. Tweedehands bank te koop';

  // Details placeholder, confirmed per Situatie for Lost & Found; other
  // categories keep no placeholder until their own copy is confirmed.
  const bodyPlaceholder = isLostAndFound
    ? (situatie === 'verloren' ? 'Vanmorgen had ik ze nog!' : situatie === 'gevonden' ? 'Deze handschoen lag bij het fietsenrek ingang park.' : undefined)
    : undefined;

  // Bezorging and Straatzaken never render this field at all (in either
  // mode) — their titles are generated from Situatie/house-number, not
  // user-created (FRE-375; confirmed for edit against Figma's "Edit Post
  // Flow v0.1", 2026-07-19). Every other category's title field keeps its
  // tailored label in both modes too (edit's Evenement field is still
  // labelled "Evenement", not a generic "Titel") — only the placeholder is
  // create-only, since edit always has a real value to show instead.
  const titleField = !(isBezorging || isStraatzaken) && (
    <TextField label={createTitleLabel} placeholder={isCreate ? createTitlePlaceholder : undefined} value={title} onChange={e => setTitle(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  const bodyField = (
    <>
      <FieldLabel>Details</FieldLabel>
      <AutoTextarea
        style={{ ...FIELD_INPUT, borderRadius: RADIUS.lg, height: 'auto', minHeight: isCreate && !isMelding ? 60 : 80, padding: '16px', marginBottom: 10 }}
        placeholder={isCreate ? bodyPlaceholder : undefined}
        value={body} onChange={e => setBody(e.target.value)}
      />
    </>
  );

  return (
    <>
      {isBezorging && (
        <>
          {situatieField}
          {isBezorgd && singleHouseField}
          {gezochtInfo}
          {bodyField}
        </>
      )}
      {isStraatzaken && (
        <>
          {situatieField}
          {dateTimeRange}
          {linkField}
          {bodyField}
        </>
      )}
      {isMelding && (
        <>
          {titleField}
          {houseRow}
          {bodyField}
        </>
      )}
      {isEvenement && (
        <>
          {titleField}
          {eventFields}
          {bodyField}
        </>
      )}
      {isAlgemeen && (
        <>
          {titleField}
          {bodyField}
        </>
      )}
      {isLostAndFound && (
        <>
          {situatieField}
          {titleField}
          {bodyField}
        </>
      )}
      {hasAttachment && (
        <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading} onError={onError}
          helperText={attachmentHelperText}
          onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); setPhotoKey(key); }} />
      )}
    </>
  );
}
