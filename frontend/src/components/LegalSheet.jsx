import { useState } from 'react';
import { COLORS } from '../design/tokens.js';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import SheetOverlay from './SheetOverlay.jsx';

// Shared display for both Terms of Use and Privacy & Data — used from
// Settings (FRE-231/FRE-234) and from the onboarding consent step, where a
// resident needs to actually be able to read the terms before agreeing to
// them, not just take it on faith and check Settings after registering.
export default function LegalSheet({ titleKey, bodyKey, onClose }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetHandle} />
      <div style={s.sheetTitle}>{t(titleKey)}</div>
      <div style={{ ...s.adminCard, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.7, maxHeight: '50vh', overflowY: 'auto' }}>
        {t(bodyKey).map(item => <div key={item} style={{ padding: '3px 0' }}>{item}</div>)}
      </div>
      <button style={{ ...s.cancelBtn, marginTop: 12 }} onClick={close}>{t('close')}</button>
    </SheetOverlay>
  );
}
