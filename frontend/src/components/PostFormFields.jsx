import { COLORS, RADIUS } from '../design/tokens.js';
import { FIELD_INPUT } from '../design/fieldStyles.js';
import { t } from '../i18n/index.js';
import HouseNumberPicker from './HouseNumberPicker.jsx';
import AutoTextarea from './AutoTextarea.jsx';
import AttachmentUpload from './AttachmentUpload.jsx';
import { FieldLabel, TextField, DateField, DropdownField } from './PostFormField.jsx';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';
import { STRAATZAKEN_TYPES, LOSTANDFOUND_TYPES } from '../utils/categories.js';

// Shared field-rendering schema for NewPostSheet (mode="create") and
// EditPostSheet (mode="edit") — previously each component duplicated almost
// this entire field set independently (FRE-316). The two modes keep
// deliberate differences (Create tailors title/label/placeholder per
// category and orders fields to guide a first-time post; Edit always shows
// a uniform Title+Description up front, has no photo re-upload, and drops
// the "required" asterisks) — those differences are branched explicitly
// below rather than silently collapsed.
export default function PostFormFields({ mode, category, subType, form, streetId, user, onError }) {
  const isCreate = mode === 'create';
  const {
    title, setTitle, body, setBody,
    startHouse, setStartHouse, endHouse, setEndHouse,
    startDate, setStartDate, endDate, setEndDate,
    link, setLink, situatie, setSituatie, pickupLocation, setPickupLocation, eventDate, setEventDate, eventTime, setEventTime,
    photoPreview, setPhotoPreview, setPhotoKey, uploading, setUploading,
  } = form;

  const { isBezorging, isStraatzaken, isMelding, isEvenement, isAlgemeen, isLostAndFound, isGezocht, isBezorgd, hasDateRange, hasLink } =
    postCategoryFlags(category, subType);

  const autoTitle = isGezocht
    ? (user?.house_number ? `Pakket gezocht voor nr. ${user.house_number}` : 'Pakket gezocht')
    : startHouse.trim() ? `Pakket aangenomen voor nr. ${startHouse.trim()}` : '';

  const singleHouseField = (
    <>
      <HouseNumberPicker
        streetId={streetId} value={startHouse} onChange={setStartHouse}
        showLabels
        numberLabel={`Voor huisnummer${isCreate ? ' *' : ''}`}
        suffixLabel="Toevoeging"
        style={{ marginBottom: isCreate ? 10 : 14 }}
      />
      {isCreate && autoTitle && <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 12 }}>Titel: <em>{autoTitle}</em></div>}
    </>
  );

  const gezochtInfo = isCreate && isGezocht && (
    <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
      Je eigen huisnummer staat al bij je bericht — daar hoef je niets voor in te vullen.
    </div>
  );

  const houseRow = !isBezorging && !isAlgemeen && !isLostAndFound && !isStraatzaken && !isEvenement && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      <div>
        <FieldLabel>Van nr.{isCreate ? ' *' : ''}</FieldLabel>
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
      <DateField type="date" label={isCreate ? 'Datum *' : t('event_date')} value={eventDate} onChange={e => setEventDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
      <DateField type="time" label={isCreate ? 'Tijdstip' : t('event_time')} value={eventTime} onChange={e => setEventTime(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
    </div>
  );

  // Straatzaken's Type-hinder (FRE-367) and Lost & Found's Verloren/Gevonden
  // (FRE-368) are both an in-post "Situatie" choice now, instead of a
  // CategoryPicker drill-down — same field, different option list per category.
  const situatieOptions = isStraatzaken ? STRAATZAKEN_TYPES : isLostAndFound ? LOSTANDFOUND_TYPES : null;
  const situatieField = situatieOptions && (
    <DropdownField
      label={isCreate ? 'Situatie *' : 'Situatie'}
      placeholder="Kies een type"
      value={situatie}
      onChange={e => setSituatie(e.target.value)}
      wrapperStyle={{ marginBottom: isCreate ? 10 : 14 }}
    >
      {situatieOptions.map(ty => <option key={ty.key} value={ty.key}>{ty.label}</option>)}
    </DropdownField>
  );

  // Lost & Found: pickup location is required once "Gevonden" is chosen,
  // never asked for "Verloren" (Post Type Specifications — Pilot v1).
  const isGevondenType = isLostAndFound && situatie === 'gevonden';
  const pickupLocationField = isGevondenType && (
    <TextField
      label={isCreate ? 'Ophaallocatie *' : 'Ophaallocatie'}
      placeholder="Bijv. Bij de brievenbus op nr. 34"
      value={pickupLocation}
      onChange={e => setPickupLocation(e.target.value)}
      wrapperStyle={{ marginBottom: 10 }}
    />
  );

  const linkField = hasLink && (
    <TextField type={isCreate ? 'url' : undefined} label={isCreate ? 'Link' : 'Externe link'} placeholder={isCreate ? 'https://…' : 'https://...'} value={link} onChange={e => setLink(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  const createTitleLabel = isMelding ? 'Onderwerp *' : isEvenement ? 'Evenement *' : isLostAndFound ? 'Wat ben je verloren of heb je gevonden? *' : 'Titel *';
  const createTitlePlaceholder = isMelding
    ? 'Kort en duidelijk'
    : isEvenement
      ? 'Bijv. Straatborrel Kerst'
      : isLostAndFound
        // Lost & Found's Verloren/Gevonden choice now lives in the in-post
        // `situatie` field (FRE-368), not the CategoryPicker-selected
        // `subType` prop, which is always null for new Lost & Found posts.
        ? (situatie === 'verloren' ? 'Bijv. Sleutelbos met rood label' : situatie === 'gevonden' ? 'Bijv. Zwarte want bij de brievenbus' : 'Bijv. Verloren of gevonden voorwerp')
        : 'Bijv. Tweedehands bank te koop';

  // Straatzaken has no user-facing title field in create mode (FRE-375) — the
  // title is auto-generated from Situatie (NewPostSheet.jsx), same pattern as
  // Bezorging's autoTitle. Edit mode still shows title for every category,
  // per this file's own established rule (see top comment).
  const titleField = !(isCreate && (isBezorging || isStraatzaken)) && (
    <TextField label={isCreate ? createTitleLabel : t('title')} placeholder={isCreate ? createTitlePlaceholder : undefined} value={title} onChange={e => setTitle(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  const bodyField = (
    <>
      <FieldLabel>{isCreate && isMelding ? 'Details *' : 'Details'}</FieldLabel>
      <AutoTextarea
        style={{ ...FIELD_INPUT, borderRadius: RADIUS.lg, height: 'auto', minHeight: isCreate && !isMelding ? 60 : 80, padding: '16px', marginBottom: 10 }}
        value={body} onChange={e => setBody(e.target.value)}
      />
    </>
  );

  if (!isCreate) {
    return (
      <>
        {titleField}
        {bodyField}
        {isBezorgd && singleHouseField}
        {situatieField}
        {pickupLocationField}
        {houseRow}
        {dateTimeRange}
        {eventFields}
        {linkField}
      </>
    );
  }

  return (
    <>
      {isBezorging && (
        <>
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
          {titleField}
          {situatieField}
          {pickupLocationField}
          {bodyField}
        </>
      )}
      {!isStraatzaken && (
        <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading} onError={onError}
          onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); setPhotoKey(key); }} />
      )}
    </>
  );
}
