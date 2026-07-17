import { useState } from 'react';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import { usePostFormState } from '../hooks/usePostFormState.js';
import PostFormFields from './PostFormFields.jsx';
import SheetOverlay from './SheetOverlay.jsx';
import CatBadge from './CatBadge.jsx';

const toDateInput = (d) => d ? d.substring(0, 10) : '';

export default function EditPostSheet({ post, onClose, onSave, streetId }) {
  const form = usePostFormState({
    title: post.title,
    body: post.body || '',
    startHouse: post.start_house || '',
    endHouse: post.end_house || '',
    startDate: toDateInput(post.start_date),
    endDate: toDateInput(post.end_date),
    startTime: post.start_time || '',
    endTime: post.end_time || '',
    eventDate: post.event_date || '',
    eventTime: post.event_time || '',
    link: post.link || '',
    situatie: post.sub_type || '',
  });
  const { title, body, startHouse, endHouse, startDate, endDate, startTime, endTime, link, situatie, eventDate, eventTime } = form;
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  return (
    <SheetOverlay closing={closing}>
        <div style={s.sheetHandle} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={s.sheetTitle}>{t('edit_post_title')}</div>
          <CatBadge cat={post.category} />
        </div>

        <PostFormFields mode="edit" category={post.category} subType={post.sub_type} form={form} streetId={streetId} />

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
            subType: situatie || undefined,
          });
          close();
        }}>
          {t('save')}
        </button>
        <button style={s.cancelBtn} onClick={close}>{t('cancel')}</button>
    </SheetOverlay>
  );
}
