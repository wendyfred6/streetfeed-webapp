import { COLORS } from '../design/tokens.js';
import { FIELD_INPUT } from '../design/fieldStyles.js';
import { t } from '../i18n/index.js';
import HouseNumberPicker from './HouseNumberPicker.jsx';
import AutoTextarea from './AutoTextarea.jsx';
import AttachmentUpload from './AttachmentUpload.jsx';
import { FieldLabel, TextField } from './PostFormField.jsx';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';

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
    startTime, setStartTime, endTime, setEndTime,
    link, setLink, eventDate, setEventDate, eventTime, setEventTime,
    photoPreview, setPhotoPreview, setPhotoKey, uploading, setUploading,
  } = form;

  const { isBezorging, isStraatzaken, isMelding, isEvenement, isAlgemeen, isLostAndFound, isGezocht, isBezorgd, hasDateRange, hasTimeRange, hasLink } =
    postCategoryFlags(category, subType);

  const autoTitle = isGezocht
    ? (user?.house_number ? `Pakket gezocht voor nr. ${user.house_number}` : 'Pakket gezocht')
    : startHouse.trim() ? `Pakket aangenomen voor nr. ${startHouse.trim()}` : '';

  const singleHouseField = (
    <>
      <FieldLabel>Huisnummer geadresseerde{isCreate ? ' *' : ''}</FieldLabel>
      <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} style={{ marginBottom: isCreate ? 10 : 14 }} />
      {isCreate && autoTitle && <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 12 }}>Titel: <em>{autoTitle}</em></div>}
    </>
  );

  const gezochtInfo = isCreate && isGezocht && (
    <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
      Je eigen huisnummer staat al bij je bericht — daar hoef je niets voor in te vullen.
    </div>
  );

  const houseRow = !isBezorging && !isAlgemeen && !isLostAndFound && (
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
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCreate ? 10 : 16, marginBottom: isCreate ? 10 : undefined }}>
        <TextField type="date" label="Datum van" value={startDate} onChange={e => setStartDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
        {hasTimeRange && (
          <TextField type="time" label="Tijd van" value={startTime} onChange={e => setStartTime(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCreate ? 10 : 16, marginBottom: isCreate ? 14 : undefined }}>
        <TextField type="date" label="Datum tot" value={endDate} onChange={e => setEndDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
        {hasTimeRange && (
          <TextField type="time" label="Tijd tot" value={endTime} onChange={e => setEndTime(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
        )}
      </div>
    </>
  );

  const eventFields = isEvenement && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: isCreate ? 14 : undefined }}>
      <TextField type="date" label={isCreate ? 'Datum *' : t('event_date')} value={eventDate} onChange={e => setEventDate(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
      <TextField type="time" label={isCreate ? 'Tijdstip' : t('event_time')} value={eventTime} onChange={e => setEventTime(e.target.value)} wrapperStyle={{ marginBottom: isCreate ? 0 : 10 }} />
    </div>
  );

  const linkField = hasLink && (
    <TextField type={isCreate ? 'url' : undefined} label={isCreate ? 'Link' : 'Externe link'} placeholder={isCreate ? 'https://…' : 'https://...'} value={link} onChange={e => setLink(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  const createTitleLabel = isMelding ? 'Onderwerp *' : isEvenement ? 'Naam *' : 'Titel *';
  const createTitlePlaceholder = isMelding
    ? 'Kort en duidelijk'
    : isEvenement
      ? 'Bijv. Straatborrel Kerst'
      : isStraatzaken
        ? 'Bijv. Vervanging gasleiding'
        : isLostAndFound
          ? (subType === 'verloren' ? 'Bijv. Sleutelbos met rood label' : subType === 'gevonden' ? 'Bijv. Zwarte want bij de brievenbus' : 'Bijv. Verloren of gevonden voorwerp')
          : 'Bijv. Tweedehands bank te koop';

  const titleField = !(isCreate && isBezorging) && (
    <TextField label={isCreate ? createTitleLabel : t('title')} placeholder={isCreate ? createTitlePlaceholder : undefined} value={title} onChange={e => setTitle(e.target.value)} wrapperStyle={{ marginBottom: 10 }} />
  );

  const bodyField = (
    <>
      <FieldLabel>{isCreate && isMelding ? 'Omschrijving *' : 'Omschrijving'}</FieldLabel>
      <AutoTextarea
        style={{ ...FIELD_INPUT, height: 'auto', minHeight: isCreate && !isMelding ? 60 : 80, padding: '16px', marginBottom: 10 }}
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
          {titleField}
          {houseRow}
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
          {houseRow}
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
          {bodyField}
        </>
      )}
      <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading} onError={onError}
        onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); setPhotoKey(key); }} />
    </>
  );
}
