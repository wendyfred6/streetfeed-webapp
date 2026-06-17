import { useState } from 'react';
import { api } from '../api/client.js';
import { COLORS, RADIUS, ALPHA, GLASS } from '../design/tokens.js';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple';
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/csr/DeviceMobile';
import { ShareIcon } from '@phosphor-icons/react/dist/csr/Share';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import HouseNumberPicker from '../components/HouseNumberPicker.jsx';

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    maxWidth: 390,
    margin: '0 auto',
  },
  logo: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: COLORS.text, marginBottom: 8 },
  accent: { color: COLORS.accent },
  card: { width: '100%', ...GLASS.card, borderRadius: RADIUS.xl, padding: '32px 24px' },
  stepLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', color: COLORS.text, marginBottom: 8, lineHeight: 1.25 },
  sub: { fontSize: 14, color: COLORS.textMuted, lineHeight: 1.55, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.accent, display: 'block', marginBottom: 6 },
  input: { width: '100%', ...GLASS.input, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '12px 14px', color: COLORS.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  btn: { width: '100%', background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4, boxShadow: `0 4px 16px ${ALPHA.terraGlow}` },
  btnDisabled: { opacity: 0.45, cursor: 'default' },
  btnGhost: { width: '100%', background: 'transparent', color: COLORS.accent, border: `2px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.pill, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12, lineHeight: 1.4 },
  preview: { ...GLASS.subtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: COLORS.textMuted },
  previewName: { fontSize: 17, fontWeight: 800, color: COLORS.text },
  heroTitle: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', color: COLORS.text, lineHeight: 1.2, marginBottom: 12 },
  heroCta: { ...GLASS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.pill, padding: '6px 12px', fontSize: 12, color: COLORS.textMuted, background: 'none', cursor: 'pointer', marginTop: 20 },
  successIcon: { display: 'flex', justifyContent: 'center', color: COLORS.accent, marginBottom: 16 },
  backBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 },
  streetConfirm: { ...GLASS.subtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '16px', marginBottom: 20 },
  streetName: { fontSize: 18, fontWeight: 800, color: COLORS.text, marginBottom: 4 },
  streetCity: { fontSize: 13, color: COLORS.textMuted },
  homeScreenBox: { ...GLASS.subtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '14px 16px', marginTop: 16, textAlign: 'left' },
  homeScreenTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8 },
  homeScreenStep: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 6 },
};

function isStandaloneDisplay() {
  return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
}

// "Alleen tonen waar relevant": niet op desktop, niet als de app al
// als standalone PWA draait. Op iOS gebruikt elke browser (Safari,
// Chrome, etc.) hetzelfde systeem-deelvenster voor "Voeg toe aan
// beginscherm", dus daar is geen browser-specifieke tekst nodig.
function HomeScreenPrompt() {
  if (isStandaloneDisplay()) return null;

  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return null;

  return (
    <div style={s.homeScreenBox}>
      <div style={s.homeScreenTitle}>
        <DeviceMobileIcon size={18} weight="regular" color={COLORS.accent} />
        Tip: zet Streetfeed op je beginscherm
      </div>
      {isIOS && (
        <>
          <div style={s.homeScreenStep}><ShareIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} />Tik op het Deel-icoon in je browser</div>
          <div style={s.homeScreenStep}>Kies &quot;Voeg toe aan beginscherm&quot;</div>
          <div style={s.homeScreenStep}>Tik op &quot;Voeg toe&quot;</div>
        </>
      )}
      {isAndroid && (
        <>
          <div style={s.homeScreenStep}><DotsThreeVerticalIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} />Tik op het menu rechtsboven in je browser</div>
          <div style={s.homeScreenStep}>Kies &quot;App installeren&quot;</div>
          <div style={s.homeScreenStep}>Bevestig met &quot;Installeren&quot;</div>
        </>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState('landing');
  const [returnUser, setReturnUser] = useState(false);

  // Adres data
  const [postcode, setPostcode] = useState('');
  const [validatedAddress, setValidatedAddress] = useState(null); // { streetId, streetName, city }
  const [houseNumber, setHouseNumber] = useState(''); // bijv. "28" of "28-2", via HouseNumberPicker

  // Profiel
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPostcode = (val) => {
    const clean = val.replace(/\s/g, '').toUpperCase();
    if (clean.length > 4) return `${clean.slice(0, 4)} ${clean.slice(4, 6)}`;
    return clean;
  };

  const handlePostcodeChange = (e) => {
    setPostcode(formatPostcode(e.target.value));
    setError('');
  };

  // Postcode verplicht: exact 4 cijfers + 2 letters
  const isValidPostcode = /^\d{4}[A-Z]{2}$/.test(postcode.replace(/\s/g, '').toUpperCase());

  const handlePostcodeSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const pc = postcode.replace(/\s/g, '');
      const result = await api.get(`/bag/resolve-street?postcode=${encodeURIComponent(pc)}`);
      setValidatedAddress(result);
      setStep('confirm');
    } catch (err) {
      if (err.status === 404) {
        if (err.data?.streetName) {
          setError(`${err.data.streetName} is nog niet beschikbaar in Streetfeed.`);
        } else {
          setError('Deze postcode is niet gevonden. Controleer hem nog eens.');
        }
      } else if (err.status === 502) {
        setError('De adressenservice is tijdelijk niet bereikbaar. Probeer het opnieuw.');
      } else {
        setError(err.message || 'Er ging iets mis');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = { email: email.trim() };
      if (!returnUser) {
        payload.firstName = firstName.trim();
        payload.houseNumber = houseNumber;
        payload.streetId = validatedAddress.streetId;
      }
      await api.post('/auth/request', payload);
      setStep('sent');
    } catch (err) {
      if (err.data?.newUser) {
        setError('Dit e-mailadres is nog niet bekend. Gebruik de volledige registratie.');
      } else {
        setError(err.message || 'Er ging iets mis');
      }
    } finally {
      setLoading(false);
    }
  };

  const preview = `${firstName || '…'} ${houseNumber || '…'}`;

  // ── LANDING ────────────────────────────────────────────────────────────────

  if (step === 'landing') {
    return (
      <div style={s.page}>
        <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
        <div style={{ width: '100%', ...GLASS.card, borderRadius: RADIUS.xl, padding: '36px 24px', textAlign: 'center', marginTop: 8 }}>
          <div style={s.heroTitle}>Alles wat er<br />speelt in jouw straat.</div>
          <p style={{ fontSize: 15, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 28 }}>
            Pakketjes, werkzaamheden, evenementen — direct bij je buren.
          </p>
          <button style={s.btn} onClick={() => setStep('address')}>
            Start gratis
          </button>
          <button style={s.heroCta} onClick={() => { setReturnUser(true); setStep('email'); }}>
            Al een account? Inloggen
          </button>
        </div>
      </div>
    );
  }

  // ── POSTCODE ──────────────────────────────────────────────────────────────

  if (step === 'address') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('landing')}>
            ← Terug
          </button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 1 van 4</div>
            <div style={s.title}>Waar woon je?</div>
            <p style={s.sub}>Streetfeed bepaalt automatisch welke straat bij jouw postcode hoort.</p>

            {error && <p style={s.error}>{error}</p>}

            <label style={s.label}>Postcode</label>
            <input
              style={s.input}
              type="text"
              placeholder="1082 AK"
              value={postcode}
              onChange={handlePostcodeChange}
              maxLength={7}
              autoComplete="postal-code"
              autoFocus
            />

            <button
              style={{ ...s.btn, ...((!isValidPostcode || loading) ? s.btnDisabled : {}) }}
              onClick={handlePostcodeSubmit}
              disabled={!isValidPostcode || loading}
            >
              {loading ? 'Straat opzoeken…' : 'Volgende'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STRAAT BEVESTIGEN ─────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('address')}>
            ← Terug
          </button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 2 van 4</div>
            <div style={s.title}>Welkom in de {validatedAddress.streetName}!</div>
            <p style={s.sub}>We hebben jouw straat gevonden. Is dit correct?</p>

            <div style={s.streetConfirm}>
              <div style={s.streetName}>{validatedAddress.streetName}</div>
              <div style={s.streetCity}>{validatedAddress.city}</div>
            </div>

            <button style={s.btn} onClick={() => setStep('huisnummer')}>
              Dit klopt
            </button>
            <button style={s.btnGhost} onClick={() => { setValidatedAddress(null); setStep('address'); }}>
              Dit klopt niet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── HUISNUMMER ────────────────────────────────────────────────────────────

  if (step === 'huisnummer') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('confirm')}>
            ← Terug
          </button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 3 van 4</div>
            <div style={s.title}>Wat is je huisnummer?</div>
            <p style={s.sub}>Kies 'm uit de bestaande adressen in de {validatedAddress.streetName}.</p>

            <label style={s.label}>Huisnummer</label>
            <HouseNumberPicker
              streetId={validatedAddress.streetId}
              value={houseNumber}
              onChange={setHouseNumber}
              style={{ marginBottom: 14 }}
            />

            <button
              style={{ ...s.btn, ...(!houseNumber ? s.btnDisabled : {}) }}
              onClick={() => setStep('name')}
              disabled={!houseNumber}
            >
              Volgende
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── VOORNAAM ──────────────────────────────────────────────────────────────

  if (step === 'name') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('huisnummer')}>
            ← Terug
          </button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 4 van 4</div>
            <div style={s.title}>Hoe mogen buren je herkennen?</div>
            <p style={s.sub}>Alleen je voornaam en huisnummer zijn zichtbaar.</p>

            <div style={s.preview}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Zo zie je eruit in de feed</div>
              <div style={s.previewName}>{firstName.trim() || '…'} {houseNumber}</div>
            </div>

            <label style={s.label}>Voornaam</label>
            <input
              style={s.input}
              type="text"
              placeholder="Bijv. Wendy"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoFocus
              autoComplete="given-name"
            />

            <button
              style={{ ...s.btn, ...(!firstName.trim() ? s.btnDisabled : {}) }}
              onClick={() => setStep('email')}
              disabled={!firstName.trim()}
            >
              Volgende
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── E-MAIL ────────────────────────────────────────────────────────────────

  if (step === 'email') {
    const canSend = email.includes('@') && email.includes('.');
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          {!returnUser && (
            <button style={s.backBtn} onClick={() => setStep('name')}>
              ← Terug
            </button>
          )}
          <div style={s.card}>
            {returnUser
              ? <>
                  <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
                  <div style={{ ...s.title, marginTop: 16 }}>Inloggen</div>
                  <p style={s.sub}>We sturen je een magische link — geen wachtwoord nodig.</p>
                </>
              : <>
                  <div style={s.stepLabel}>Bijna klaar</div>
                  <div style={s.title}>Maak je account aan</div>
                  <p style={s.sub}>We sturen je een magische link — geen wachtwoord nodig.</p>
                </>
            }

            {error && <p style={s.error}>{error}</p>}

            <label style={s.label}>E-mailadres</label>
            <input
              style={s.input}
              type="email"
              placeholder="jij@voorbeeld.nl"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              autoFocus
              autoComplete="email"
            />

            <button
              style={{ ...s.btn, ...(!canSend || loading ? s.btnDisabled : {}) }}
              onClick={handleSendMagicLink}
              disabled={!canSend || loading}
            >
              {loading ? 'Versturen…' : 'Stuur magische link'}
            </button>

            {returnUser && (
              <button style={s.btnGhost} onClick={() => { setReturnUser(false); setStep('landing'); }}>
                Nieuw account aanmaken
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VERSTUURD ─────────────────────────────────────────────────────────────

  if (step === 'sent') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%', ...GLASS.card, borderRadius: RADIUS.xl, padding: '36px 24px', textAlign: 'center' }}>
          <div style={s.successIcon}><EnvelopeSimpleIcon size={48} weight="regular" /></div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>Check je e-mail</div>
          <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
            We hebben een link gestuurd naar <strong style={{ color: COLORS.text }}>{email}</strong>. Klik op de link om in te loggen.
          </p>
          <div style={{ ...GLASS.subtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '12px 14px', fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
            Geen mail ontvangen? Check je spam, of{' '}
            <button
              style={{ background: 'none', border: 'none', color: COLORS.accent, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}
              onClick={() => { setStep('email'); setError(''); }}
            >
              probeer opnieuw
            </button>
            .
          </div>
          <HomeScreenPrompt />
        </div>
      </div>
    );
  }

  return null;
}
