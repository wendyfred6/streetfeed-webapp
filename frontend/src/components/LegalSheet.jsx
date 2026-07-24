import { useState } from 'react';
import { s } from '../design/appStyles.js';
import { t } from '../i18n/index.js';
import SheetOverlay from './SheetOverlay.jsx';
import LegalContent from './LegalContent.jsx';

// Shared display for both Terms of Use and Privacy & Data — used from the
// Account page (FRE-392 and siblings) and from the onboarding consent step,
// where a resident needs to actually be able to read the terms before
// agreeing to them, not just take it on faith and check Account after
// registering. Body rendering itself lives in LegalContent.jsx, shared with
// the Account page's inline accordion so both surfaces always show the same
// copy (FRE-397/398) rather than two independently-maintained texts.
export default function LegalSheet({ titleKey, introKey, sectionsKey, contactCtaKey, streetName, onClose }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 270); };

  return (
    <SheetOverlay closing={closing} onOverlayClick={close}>
      <div style={s.sheetTitle}>{t(titleKey)}</div>
      <div style={{ ...s.adminCard, maxHeight: '50vh', overflowY: 'auto' }}>
        <LegalContent introKey={introKey} sectionsKey={sectionsKey} contactCtaKey={contactCtaKey} streetName={streetName} />
      </div>
      <button style={{ ...s.cancelBtn, marginTop: 12 }} onClick={close}>{t('close')}</button>
    </SheetOverlay>
  );
}
