import { useState, useRef } from 'react';
import { COLORS } from '../design/tokens.js';
import { api } from '../api/client.js';
import { t } from '../i18n/index.js';
import ActionMenu from './ActionMenu.jsx';
import { PlusIcon, PaperclipIcon, CrossIcon } from '../icons/index.jsx';

// Backend storage discards the original filename (saveFile() in storage.js
// writes photos under a randomUUID() key) — for a pre-existing photo (edit
// mode, nothing chosen this session) there's no real filename available at
// all. Deriving one from the URL's last path segment is still real, dynamic
// data rather than a hardcoded placeholder, so it's the least-wrong fallback
// until the backend keeps the original name too.
const filenameFromUrl = (url) => {
  if (!url) return '';
  try {
    const path = url.split('?')[0];
    return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
  } catch {
    return '';
  }
};

// helperText is optional and category-specific (e.g. Bezorging/Lost & Found/
// Evenement each have their own Figma copy) — omit it for categories that
// don't need it yet. Empty-state layout matches the Pattern Library's
// AttachmentUpload (inline helper text + circular "+" button, node 257:7526),
// confirmed 2026-07-19 (FRE-373, previously tracked but never implemented).
// The attached state deliberately does NOT use the Pattern Library's bordered
// AttachmentItem chip (node 257:7480) — on-device feedback the same day asked
// for a borderless row matching the New Post Sheet's own field rhythm instead.
export default function AttachmentUpload({ onPhotoUploaded, onDocumentChosen, photoPreview, documentName, uploading, onUploading, onError, helperText }) {
  const [showMenu, setShowMenu] = useState(false);
  const [photoName, setPhotoName] = useState(() => filenameFromUrl(photoPreview));
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoName(file.name);
    onPhotoUploaded(URL.createObjectURL(file), null);
    onUploading?.(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { key } = await api.post('/upload', formData);
      onPhotoUploaded(URL.createObjectURL(file), key);
    } catch (err) {
      onPhotoUploaded(null, null);
      setPhotoName('');
      onError?.(err.message || t('attachment_upload_failed'));
    } finally {
      onUploading?.(false);
    }
  };

  const clearAttachment = () => {
    onPhotoUploaded(null, null);
    onDocumentChosen?.(null);
    setPhotoName('');
  };

  const hasAttachment = photoPreview || documentName;

  return (
    <>
      {hasAttachment ? (
        // Borderless row (2026-07-19 on-device feedback) — deliberately not
        // the Pattern Library's bordered AttachmentItem chip; the icon sits
        // flush with the left edge of the other form fields, no boxed
        // container, matching the New Post Sheet's own spacing rhythm.
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48 }}>
          <PaperclipIcon size={32} color={COLORS.text} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uploading ? t('attachment_uploading') : (documentName || photoName)}
          </span>
          <button type="button" onClick={clearAttachment} aria-label={t('attachment_remove')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
            <CrossIcon size={24} color={COLORS.textMuted} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {helperText && <div style={{ flex: 1, fontSize: 12, color: COLORS.text }}>{helperText}</div>}
          <button type="button" onClick={() => setShowMenu(true)} aria-label={t('attachment_add')}
            style={{ background: COLORS.background, border: `1px solid ${COLORS.borderTertiary}`, borderRadius: 999, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <PlusIcon size={24} color={COLORS.text} />
          </button>
        </div>
      )}
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
