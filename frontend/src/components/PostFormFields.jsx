import { COLORS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import HouseNumberPicker from './HouseNumberPicker.jsx';
import AutoTextarea from './AutoTextarea.jsx';
import AttachmentUpload from './AttachmentUpload.jsx';
import { postCategoryFlags } from '../utils/postCategoryFlags.js';

// Shared field-rendering schema for NewPostSheet (mode="create") and
// EditPostSheet (mode="edit") — previously each component duplicated almost
// this entire field set independently (FRE-316). The two modes keep
// deliberate differences (Create tailors title/label/placeholder per
// category and orders fields to guide a first-time post; Edit always shows
// a uniform Title+Description up front, has no photo re-upload, and drops
// the "required" asterisks) — those differences are branched explicitly
// below rather than silently collapsed.
export default function PostFormFields({ mode, category, subType, form, streetId, user }) {
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
      <label style={s.label}>Huisnummer geadresseerde{isCreate ? ' *' : ''}</label>
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
        <label style={s.label}>Van nr.{isCreate ? ' *' : ''}</label>
        <HouseNumberPicker streetId={streetId} value={startHouse} onChange={setStartHouse} showSuffix={false} />
      </div>
      <div>
        <label style={s.label}>Tot nr.</label>
        <HouseNumberPicker streetId={streetId} value={endHouse} onChange={setEndHouse} showSuffix={false} />
      </div>
    </div>
  );

  const dateTimeRange = hasDateRange && (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCreate ? 10 : 16, marginBottom: isCreate ? 10 : undefined }}>
        <div>
          <label style={s.label}>Datum van</label>
          <input type="date" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {hasTimeRange && (
          <div>
            <label style={s.label}>Tijd van</label>
            <input type="time" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isCreate ? 10 : 16, marginBottom: isCreate ? 14 : undefined }}>
        <div>
          <label style={s.label}>Datum tot</label>
          <input type="date" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {hasTimeRange && (
          <div>
            <label style={s.label}>Tijd tot</label>
            <input type="time" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        )}
      </div>
    </>
  );

  const eventFields = isEvenement && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: isCreate ? 14 : undefined }}>
      <div>
        <label style={s.label}>{isCreate ? 'Datum *' : t('event_date')}</label>
        <input type="date" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={eventDate} onChange={e => setEventDate(e.target.value)} />
      </div>
      <div>
        <label style={s.label}>{isCreate ? 'Tijdstip' : t('event_time')}</label>
        <input type="time" style={isCreate ? { ...s.input, marginBottom: 0 } : s.input} value={eventTime} onChange={e => setEventTime(e.target.value)} />
      </div>
    </div>
  );

  const linkField = hasLink && (
    <>
      <label style={s.label}>{isCreate ? 'Link' : 'Externe link'}</label>
      <input type={isCreate ? 'url' : undefined} style={s.input} placeholder={isCreate ? 'https://…' : 'https://...'} value={link} onChange={e => setLink(e.target.value)} />
    </>
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
    <>
      <label style={s.label}>{isCreate ? createTitleLabel : t('title')}</label>
      <input style={s.input} placeholder={isCreate ? createTitlePlaceholder : undefined} value={title} onChange={e => setTitle(e.target.value)} />
    </>
  );

  const bodyField = (
    <>
      <label style={s.label}>{isCreate && isMelding ? 'Omschrijving *' : 'Omschrijving'}</label>
      <AutoTextarea style={isCreate && !isMelding ? { ...s.textarea, minHeight: 60 } : s.textarea} value={body} onChange={e => setBody(e.target.value)} />
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
      <AttachmentUpload photoPreview={photoPreview} uploading={uploading} onUploading={setUploading}
        onPhotoUploaded={(preview, key) => { setPhotoPreview(preview); if (key) setPhotoKey(key); }} />
    </>
  );
}
