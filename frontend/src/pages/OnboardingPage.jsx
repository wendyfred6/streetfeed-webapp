import { useState } from 'react';
import { api } from '../api/client.js';
import { COLORS, RADIUS } from '../design/tokens.js';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import HouseNumberPicker from '../components/HouseNumberPicker.jsx';

const s = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(env(safe-area-inset-top) + 20px) 20px calc(env(safe-area-inset-bottom) + 20px)',
    boxSizing: 'border-box',
  },
  loginWrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 40,
  },
  logo: { fontSize: 32, fontWeight: 800, color: COLORS.text, textAlign: 'center', letterSpacing: '-0.5px' },
  accent: { color: COLORS.accent },
  card: {
    width: '100%',
    background: COLORS.background,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    borderRadius: RADIUS.lg,
    padding: 40,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  stepLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textDim, lineHeight: 'normal' },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: COLORS.text, lineHeight: '28px' },
  sub: { fontSize: 16, color: COLORS.textMuted, lineHeight: '24px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textDim, lineHeight: 'normal', display: 'block' },
  input: {
    width: '100%',
    background: COLORS.background,
    border: `1px solid ${COLORS.accent}`,
    borderRadius: RADIUS.pill,
    height: 48,
    padding: '4px 16px',
    color: COLORS.text,
    fontSize: 12,
    lineHeight: '18px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  ctaGroup: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  btn: {
    width: '100%',
    background: COLORS.accent,
    color: COLORS.textInverse,
    border: 'none',
    borderRadius: RADIUS.pill,
    height: 48,
    padding: '4px 16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  btnDisabled: { opacity: 0.45, cursor: 'default' },
  btnOutline: {
    width: '100%',
    background: 'transparent',
    color: COLORS.text,
    border: `1px solid ${COLORS.borderPrimary}`,
    borderRadius: RADIUS.pill,
    height: 48,
    padding: '4px 16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  standaloneLink: {
    display: 'flex', alignItems: 'center', gap: 2,
    background: 'none', border: 'none',
    color: COLORS.text, fontSize: 12, lineHeight: '18px',
    cursor: 'pointer', padding: 0,
  },
  backBtn: {
    background: 'none', border: 'none',
    color: COLORS.textMuted, fontSize: 13,
    cursor: 'pointer', padding: 0, marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  error: { color: COLORS.error, fontSize: 13, lineHeight: 1.4 },
  inputFieldsGroup: { display: 'flex', flexDirection: 'column', gap: 24 },
  previewGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  previewLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: COLORS.textMuted, lineHeight: 'normal' },
  previewName: { fontSize: 14, fontWeight: 700, color: COLORS.text, lineHeight: '20px' },
  noMailGroup: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', color: COLORS.textMuted, fontSize: 12, lineHeight: '18px' },
};

export default function OnboardingPage() {
  const [step, setStep] = useState('login');

  const [postcode, setPostcode] = useState('');
  const [validatedAddress, setValidatedAddress] = useState(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSendLogin = email.includes('@') && email.includes('.');

  const handleLoginSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/request', { email: email.trim() });
      setStep('sent');
    } catch (err) {
      if (err.data?.newUser) {
        setStep('unknown');
      } else {
        setError(err.message || 'Er ging iets mis');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPostcode = (val) => {
    const clean = val.replace(/\s/g, '').toUpperCase();
    if (clean.length > 4) return `${clean.slice(0, 4)} ${clean.slice(4, 6)}`;
    return clean;
  };

  const handlePostcodeChange = (e) => {
    setPostcode(formatPostcode(e.target.value));
    setError('');
  };

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

  const handleCreateAccount = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/request', {
        email: email.trim(),
        firstName: firstName.trim(),
        houseNumber,
        streetId: validatedAddress.streetId,
      });
      setStep('sent');
    } catch (err) {
      setError(err.message || 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  // ── INLOGGEN ──────────────────────────────────────────────────────────────

  if (step === 'login') {
    return (
      <div style={s.page}>
        <div style={s.loginWrapper}>
          <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
          <div style={s.card}>
            <div style={s.titleGroup}>
              <div style={s.title}>Inloggen</div>
              <div style={s.sub}>We sturen je een Magic Link, geen wachtwoord nodig.</div>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.fieldGroup}>
              <label style={s.label}>E-mail adres</label>
              <input
                style={s.input}
                type="email"
                placeholder="jij@voorbeeld.nl"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoFocus
                autoComplete="email"
              />
            </div>
            <div style={s.ctaGroup}>
              <button
                style={{ ...s.btn, ...(!canSendLogin || loading ? s.btnDisabled : {}) }}
                onClick={handleLoginSubmit}
                disabled={!canSendLogin || loading}
              >
                {loading ? 'Versturen…' : 'Stuur Magic Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── E-MAILADRES ONBEKEND ─────────────────────────────────────────────────

  if (step === 'unknown') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.titleGroup}>
            <div style={s.title}>We kennen dit e-mailadres nog niet</div>
            <div style={s.sub}>Jouw e-mailadres is onbekend.</div>
          </div>
          <div style={s.ctaGroup}>
            <button style={s.btn} onClick={() => setStep('address')}>
              Account aanmaken
            </button>
            <button style={s.standaloneLink} onClick={() => { setError(''); setStep('login'); }}>
              Ander e-mailadres gebruiken
              <CaretRightIcon size={8} weight="regular" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── POSTCODE ──────────────────────────────────────────────────────────────

  if (step === 'address') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('unknown')}>← Terug</button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 1 van 4</div>
            <div style={s.titleGroup}>
              <div style={s.title}>Waar woon je?</div>
              <div style={s.sub}>Streetfeed bepaalt automatisch welke straat bij jouw postcode hoort.</div>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.fieldGroup}>
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
            </div>
            <div style={s.ctaGroup}>
              <button
                style={{ ...s.btn, ...(!isValidPostcode || loading ? s.btnDisabled : {}) }}
                onClick={handlePostcodeSubmit}
                disabled={!isValidPostcode || loading}
              >
                {loading ? 'Straat opzoeken…' : 'Volgende'}
              </button>
            </div>
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
          <button style={s.backBtn} onClick={() => setStep('address')}>← Terug</button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 2 van 4</div>
            <div style={s.titleGroup}>
              <div style={s.title}>Welkom in de {validatedAddress.streetName}</div>
              <div style={s.sub}>We hebben je straat gevonden. Is dit correct?</div>
            </div>
            <div style={s.ctaGroup}>
              <button style={s.btn} onClick={() => setStep('huisnummer')}>
                Dit klopt
              </button>
              <button style={s.btnOutline} onClick={() => { setValidatedAddress(null); setStep('address'); }}>
                Dit klopt niet
              </button>
            </div>
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
          <button style={s.backBtn} onClick={() => setStep('confirm')}>← Terug</button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 3 van 4</div>
            <div style={s.titleGroup}>
              <div style={s.title}>Wat is je huisnummer?</div>
              <div style={s.sub}>Kies je huisnummer en toevoeging in de straat.</div>
            </div>
            <HouseNumberPicker
              streetId={validatedAddress.streetId}
              value={houseNumber}
              onChange={setHouseNumber}
              showLabels
            />
            <div style={s.ctaGroup}>
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
      </div>
    );
  }

  // ── VOORNAAM ──────────────────────────────────────────────────────────────

  if (step === 'name') {
    return (
      <div style={s.page}>
        <div style={{ width: '100%' }}>
          <button style={s.backBtn} onClick={() => setStep('huisnummer')}>← Terug</button>
          <div style={s.card}>
            <div style={s.stepLabel}>Stap 4 van 4</div>
            <div style={s.titleGroup}>
              <div style={s.title}>Hoe mogen buren je herkennen?</div>
              <div style={s.sub}>Alleen je voornaam en huisnummer zijn zichtbaar.</div>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.inputFieldsGroup}>
              <div style={s.fieldGroup}>
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
              </div>
              <div style={s.previewGroup}>
                <div style={s.previewLabel}>Zo zien buren je in de feed</div>
                <div style={s.previewName}>{firstName.trim() || '…'} {houseNumber}</div>
              </div>
            </div>
            <div style={s.ctaGroup}>
              <button
                style={{ ...s.btn, ...(!firstName.trim() || loading ? s.btnDisabled : {}) }}
                onClick={handleCreateAccount}
                disabled={!firstName.trim() || loading}
              >
                {loading ? 'Versturen…' : 'Stuur Magic Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VERSTUURD ─────────────────────────────────────────────────────────────

  if (step === 'sent') {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={s.titleGroup}>
            <div style={s.title}>Check je e-mail</div>
            <div style={s.sub}>
              We hebben een Magic Link gestuurd naar{' '}
              <strong style={{ color: COLORS.text }}>{email}</strong>.{' '}
              Klik op de link in je e-mail om in te loggen.
            </div>
          </div>
          <div style={s.noMailGroup}>
            <span>Geen mail ontvangen?</span>
            <span>
              Check je spam of{' '}
              <button
                style={{ background: 'none', border: 'none', color: COLORS.accent, fontSize: 12, lineHeight: '18px', cursor: 'pointer', padding: 0, display: 'inline' }}
                onClick={() => { setStep('login'); setError(''); }}
              >
                probeer opnieuw
              </button>
              .
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
