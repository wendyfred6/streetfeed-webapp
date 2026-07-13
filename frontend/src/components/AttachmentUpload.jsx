import { useState, useRef } from 'react';
import { COLORS } from '../design/tokens.js';
import ActionMenu from './ActionMenu.jsx';

export default function AttachmentUpload({ onPhotoUploaded, onDocumentChosen, photoPreview, documentName, uploading, onUploading }) {
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
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) throw new Error('Upload mislukt');
      const { key } = await res.json();
      onPhotoUploaded(URL.createObjectURL(file), key);
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      onUploading?.(false);
    }
  };

  const hasAttachment = photoPreview || documentName;

  return (
    <>
      <button type="button" onClick={() => setShowMenu(true)}
        style={{ width: '100%', background: COLORS.bg, border: `1px solid ${hasAttachment ? COLORS.accent : COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, color: hasAttachment ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', marginBottom: 4 }}>
        {uploading ? 'Uploaden…' : hasAttachment ? (documentName || 'Foto gekozen') : 'Bijlage toevoegen'}
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
            { label: 'Foto maken', action: () => { setShowMenu(false); cameraRef.current?.click(); } },
            { label: 'Kies foto', action: () => { setShowMenu(false); photoRef.current?.click(); } },
            { label: 'Kies bestand', action: () => { setShowMenu(false); docRef.current?.click(); } },
          ]}
        />
      )}
    </>
  );
}
