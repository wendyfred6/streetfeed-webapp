import { useState, useRef } from 'react';
import { COLORS } from '../design/tokens.js';
import { api } from '../api/client.js';
import { t } from '../i18n/index.js';
import ActionMenu from './ActionMenu.jsx';

// helperText is optional and category-specific (e.g. Bezorging/Lost & Found/
// Evenement each have their own Figma copy) — omit it for categories that
// don't need it yet. The current button-with-no-adjacent-text layout is
// still the pre-Pattern-Library one (FRE-373 replaces it with Figma's
// circular "+" button + inline helper text); this just wires the copy
// through now so FRE-373 doesn't need to invent that plumbing later.
export default function AttachmentUpload({ onPhotoUploaded, onDocumentChosen, photoPreview, documentName, uploading, onUploading, onError, helperText }) {
  const [showMenu, setShowMenu] = useState(false);
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onPhotoUploaded(URL.createObjectURL(file), null);
    onUploading?.(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { key } = await api.post('/upload', formData);
      onPhotoUploaded(URL.createObjectURL(file), key);
    } catch (err) {
      onPhotoUploaded(null, null);
      onError?.(err.message || t('attachment_upload_failed'));
    } finally {
      onUploading?.(false);
    }
  };

  const hasAttachment = photoPreview || documentName;

  return (
    <>
      {helperText && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{helperText}</div>}
      <button type="button" onClick={() => setShowMenu(true)}
        style={{ width: '100%', background: COLORS.bg, border: `1px solid ${hasAttachment ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: hasAttachment ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', marginBottom: 4 }}>
        {uploading ? t('attachment_uploading') : hasAttachment ? (documentName || t('attachment_photo_chosen')) : t('attachment_add')}
      </button>
      {photoPreview && <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 10, objectFit: 'cover', maxHeight: 160 }} />}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
        onChange={e => { onDocumentChosen(e.target.files[0]?.name || null); setShowMenu(false); }} />
      {showMenu && (
        <ActionMenu
          onClose={() => setShowMenu(false)}
          items={[
            { label: t('attachment_take_photo'), action: () => { setShowMenu(false); cameraRef.current?.click(); } },
            { label: t('attachment_choose_photo'), action: () => { setShowMenu(false); photoRef.current?.click(); } },
            { label: t('attachment_choose_file'), action: () => { setShowMenu(false); docRef.current?.click(); } },
          ]}
        />
      )}
    </>
  );
}
