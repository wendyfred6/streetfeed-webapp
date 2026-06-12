import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { t } from '../i18n/index.js';
import HouseNumberPicker from '../components/HouseNumberPicker.jsx';

import { COLORS, RADIUS, ALPHA, GLASS } from '../design/tokens.js';

const s = {
  page: { minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, ...GLASS.card, borderRadius: RADIUS.xl, padding: '32px 28px' },
  logo: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8, color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28, lineHeight: 1.5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.accent, display: 'block', marginBottom: 6 },
  input: { width: '100%', ...GLASS.input, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.md, padding: '12px 14px', color: COLORS.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  btn: { width: '100%', background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4, boxShadow: `0 4px 16px ${ALPHA.terraGlow}` },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12 },
  success: { textAlign: 'center', padding: '8px 0' },
  successTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  successBody: { fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 },
  divider: { borderTop: `1px solid ${ALPHA.accentBorder}`, margin: '20px 0' },
  pendingBox: { ...GLASS.subtle, border: `1px solid ${ALPHA.accentBorder}`, borderRadius: RADIUS.lg, padding: '14px 16px', fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 12 },
};

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const tokenParam = params.get('token');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [house, setHouse] = useState('');
  const [houseError, setHouseError] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(!!tokenParam);
  const [verifyError, setVerifyError] = useState('');

  const HOUSE_REGEX = /^\d+-(hs|\d+)$/i;

  const handleHouseChange = (e) => {
    const val = e.target.value;
    setHouse(val);
    if (val && !HOUSE_REGEX.test(val.trim())) {
      setHouseError('Gebruik het formaat 28-hs of 28-1');
    } else {
      setHouseError('');
    }
  };

  const errorParam = params.get('error');

  // Optie A: frontend verifies the magic-link token directly so the session
  // cookie is set in the browser that the user is actually using (not a WebView).
  useEffect(() => {
    if (!tokenParam) return;
    api.get(`/auth/verify?token=${encodeURIComponent(tokenParam)}`)
      .then(() => refresh().then(() => navigate('/')))
      .catch((err) => {
        setVerifying(false);
        const code = err?.data?.error;
        if (code === 'expired') {
          setVerifyError('De link is verlopen. Vraag een nieuwe aan.');
        } else {
          setVerifyError('Verificatie mislukt. Probeer opnieuw.');
        }
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Valideer huisnummer-formaat
    if (needsProfile && house && !HOUSE_REGEX.test(house.trim())) {
      setHouseError('Gebruik het formaat 28-hs of 28-1');
      return;
    }

    setLoading(true);
    const fullName = needsProfile
      ? `${firstName.trim()} ${lastName.trim()}`.trim()
      : undefined;

    try {
      await api.post('/auth/request', {
        email: email.trim(),
        name: fullName || undefined,
        houseNumber: house.trim() || undefined,
        streetId: 1, // default: Reyer Anslostraat
      });
      setSent(true);
    } catch (err) {
      if (err.data?.newUser) {
        setNeedsProfile(true);
      } else {
        setError(err.message || 'Er ging iets mis');
      }
    } finally {
      setLoading(false);
    }
  };

  // Bezig met token verifiëren — toon laadscherm
  if (verifying) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.success}>
            <div style={s.successTitle}>Even inloggen…</div>
            <div style={s.successBody}>Je link wordt gecontroleerd.</div>
          </div>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.success}>
            <div style={s.successTitle}>{t('check_email')}</div>
            <div style={s.successBody}>{t('magic_sent', { email })}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Street<span style={{ color: COLORS.terracotta }}>feed</span></div>
        <p style={s.subtitle}>{t('login_subtitle')}</p>

        {(verifyError || errorParam === 'expired') && (
          <p style={s.error}>{verifyError || 'De link is verlopen. Vraag een nieuwe aan.'}</p>
        )}

        <form onSubmit={handleSubmit}>
          {error && <p style={s.error}>{error}</p>}

          <label style={s.label}>{t('email')}</label>
          <input
            style={s.input}
            type="email"
            placeholder={t('email_placeholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />

          {needsProfile && (
            <>
              <div style={s.divider} />
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                Welkom! Dit is je eerste keer — vul je naam en huisnummer in.
                De straat admin moet je verzoek goedkeuren voordat je toegang krijgt.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={s.label}>Voornaam</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="Bijv. Wendy"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required={needsProfile}
                  />
                </div>
                <div>
                  <label style={s.label}>Achternaam</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="Bijv. Jansen"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required={needsProfile}
                  />
                </div>
              </div>

              <label style={s.label}>Huisnummer + etage</label>
              <HouseNumberPicker
                value={house}
                onChange={(v) => { setHouse(v); setHouseError(''); }}
                streetName="Reyer Anslostraat"
                city="Amsterdam"
                style={{ marginBottom: 14 }}
              />
              {houseError && <p style={{ ...s.error, marginTop: -8 }}>{houseError}</p>}
            </>
          )}

          <button
            style={{ ...s.btn, opacity: (needsProfile && (!firstName.trim() || !lastName.trim() || !house.trim() || !!houseError)) ? 0.5 : 1 }}
            type="submit"
            disabled={loading || !!(needsProfile && (!firstName.trim() || !lastName.trim() || !house.trim() || !!houseError))}
          >
            {loading ? t('loading') : t('send_link')}
          </button>
        </form>
      </div>
    </div>
  );
}
