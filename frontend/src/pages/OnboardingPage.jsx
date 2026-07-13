import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { COLORS, RADIUS } from '../design/tokens.js';
import { FIELD_INPUT, FIELD_LABEL, FIELD_GROUP } from '../design/onboardingStyles.js';
import { t, getLang, setLang } from '../i18n/index.js';
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
    background: 'transparent',
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
  },
  // Uppercase hoort hier wél bij (het is de "STAP X VAN 4"-sectietitel, niet
  // het gedeelde FieldLabel-component — zie onboardingStyles.js).
  stepLabel: { ...FIELD_LABEL, textTransform: 'uppercase' },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: COLORS.text, lineHeight: '28px' },
  sub: { fontSize: 16, color: COLORS.textMuted, lineHeight: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: 32 },
  fieldGroup: FIELD_GROUP,
  label: { ...FIELD_LABEL, display: 'block' },
  input: FIELD_INPUT,
  inputAccent: { ...FIELD_INPUT, border: `1px solid ${COLORS.accent}` },
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
    fontWeight: 500,
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
    fontWeight: 500,
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
  error: { color: COLORS.error, fontSize: 13, lineHeight: 1.4 },
  inputFieldsGroup: { display: 'flex', flexDirection: 'column', gap: 24 },
  previewGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  previewLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 0, color: COLORS.textDim, lineHeight: 'normal' },
  previewName: { fontSize: 14, fontWeight: 700, color: COLORS.text, lineHeight: '20px' },
  noMailGroup: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', color: COLORS.textMuted, fontSize: 12, lineHeight: '18px' },
  langToggle: { display: 'flex', gap: 12, marginTop: 8 },
  langOption: (active) => ({
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 700 : 400,
    color: active ? COLORS.text : COLORS.textMuted,
  }),
};

export default function OnboardingPage() {
  const location = useLocation();
  const [step, setStep] = useState('login');

  // Verplaatst focus naar de titel bij stappen zonder autoFocus-veld, zodat
  // schermlezers de nieuwe stap aankondigen — anders blijft focus stil op een
  // element dat net uit de DOM is verdwenen. Stappen mét een tekstveld
  // (login/address/name) autofocussen dat veld al, wat hier voorrang krijgt
  // boven het aankondigen van de titel (FRE-306).
  const titleRef = useRef(null);
  useEffect(() => {
    if (step === 'confirm' || step === 'huisnummer' || step === 'sent') {
      titleRef.current?.focus();
    }
  }, [step]);

  const [postcode, setPostcode] = useState('');
  const [validatedAddress, setValidatedAddress] = useState(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  // De taaltoggle in ProfileView is pas bereikbaar na inloggen — voor een
  // nieuwe bewoner die nog geen account heeft is dit de enige plek waar
  // de taal vóór het inloggen gezet kan worden (FRE-305).
  const [lang, setLangState] = useState(getLang());
  const switchLang = (l) => { setLang(l); setLangState(l); };

  const [loading, setLoading] = useState(false);
  // Alleen de eigen /auth-verificatie mag hier een fout injecteren; herbezoeken van
  // deze pagina zonder navigatiestatus toont geen stale error.
  const [error, setError] = useState(location.state?.authError || '');

  const canSendLogin = email.includes('@') && email.includes('.');

  // Of dit e-mailadres al een account heeft, wordt hier bewust niet meer aan de
  // backend-respons afgelezen (dat was een user-enumeration oracle — FRE-301/FRE-295).
  // De gebruiker geeft zelf aan of het een bestaand of nieuw account is.
  const handleLoginSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/request', { email: email.trim() });
      setStep('sent');
    } catch (err) {
      setError(err.message || t('onboarding_generic_error'));
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
          setError(t('onboarding_postcode_err_unavailable', { streetName: err.data.streetName }));
        } else {
          setError(t('onboarding_postcode_err_not_found'));
        }
      } else if (err.status === 502) {
        setError(t('onboarding_postcode_err_service_down'));
      } else {
        setError(err.message || t('onboarding_generic_error'));
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
      setError(err.message || t('onboarding_generic_error'));
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
              <div style={s.title}>{t('onboarding_login_title')}</div>
              <div style={s.sub}>{t('onboarding_login_subtitle')}</div>
            </div>
            {error && <div role="alert" style={s.error}>{error}</div>}
            <form style={s.form} onSubmit={e => { e.preventDefault(); handleLoginSubmit(); }}>
              <div style={s.fieldGroup}>
                <label htmlFor="onboarding-email" style={s.label}>{t('onboarding_email_label')}</label>
                <input
                  id="onboarding-email"
                  style={s.input}
                  type="email"
                  placeholder={t('onboarding_email_placeholder')}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}

                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div style={s.ctaGroup}>
                <button
                  type="submit"
                  style={{ ...s.btn, ...(!canSendLogin || loading ? s.btnDisabled : {}) }}
                  disabled={!canSendLogin || loading}
                >
                  {loading ? t('onboarding_sending') : t('onboarding_send_magic_link')}
                </button>
                <button type="button" style={s.standaloneLink} onClick={() => { setError(''); setStep('address'); }}>
                  {t('onboarding_new_here')}
                  <CaretRightIcon size={8} weight="regular" />
                </button>
              </div>
            </form>
            <div style={s.langToggle}>
              <button type="button" style={s.langOption(lang === 'nl')} onClick={() => switchLang('nl')}>Nederlands</button>
              <button type="button" style={s.langOption(lang === 'en')} onClick={() => switchLang('en')}>English</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── POSTCODE ──────────────────────────────────────────────────────────────

  if (step === 'address') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.stepLabel}>{t('onboarding_step', { step: 1, total: 4 })}</div>
          <div style={s.titleGroup}>
            <div style={s.title}>{t('onboarding_address_title')}</div>
            <div style={s.sub}>{t('onboarding_address_sub')}</div>
          </div>
          {error && <div role="alert" style={s.error}>{error}</div>}
          <form style={s.form} onSubmit={e => { e.preventDefault(); handlePostcodeSubmit(); }}>
            <div style={s.fieldGroup}>
              <label htmlFor="onboarding-postcode" style={s.label}>{t('onboarding_postcode_label')}</label>
              <input
                id="onboarding-postcode"
                style={s.input}
                type="text"
                placeholder={t('onboarding_postcode_placeholder')}
                value={postcode}
                onChange={handlePostcodeChange}

                maxLength={7}
                autoComplete="postal-code"
                autoFocus
              />
            </div>
            <div style={s.ctaGroup}>
              <button
                type="submit"
                style={{ ...s.btn, ...(!isValidPostcode || loading ? s.btnDisabled : {}) }}
                disabled={!isValidPostcode || loading}
              >
                {loading ? t('onboarding_resolving_street') : t('onboarding_next')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── STRAAT BEVESTIGEN ─────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.stepLabel}>{t('onboarding_step', { step: 2, total: 4 })}</div>
          <div style={s.titleGroup}>
            <div ref={titleRef} tabIndex={-1} style={s.title}>{t('onboarding_confirm_title', { streetName: validatedAddress.streetName })}</div>
            <div style={s.sub}>{t('onboarding_confirm_sub')}</div>
          </div>
          <div style={s.ctaGroup}>
            <button type="button" style={s.btn} onClick={() => setStep('huisnummer')}>
              {t('onboarding_confirm_yes')}
            </button>
            <button type="button" style={s.btnOutline} onClick={() => { setValidatedAddress(null); setStep('address'); }}>
              {t('onboarding_confirm_no')}
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
        <div style={s.card}>
          <div style={s.stepLabel}>{t('onboarding_step', { step: 3, total: 4 })}</div>
          <div style={s.titleGroup}>
            <div ref={titleRef} tabIndex={-1} style={s.title}>{t('onboarding_house_title')}</div>
            <div style={s.sub}>{t('onboarding_house_sub')}</div>
          </div>
          <HouseNumberPicker
            streetId={validatedAddress.streetId}
            value={houseNumber}
            onChange={setHouseNumber}
            showLabels
          />
          <div style={s.ctaGroup}>
            <button
              type="button"
              style={{ ...s.btn, ...(!houseNumber ? s.btnDisabled : {}) }}
              onClick={() => setStep('name')}
              disabled={!houseNumber}
            >
              {t('onboarding_next')}
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
        <div style={s.card}>
          <div style={s.stepLabel}>{t('onboarding_step', { step: 4, total: 4 })}</div>
          <div style={s.titleGroup}>
            <div style={s.title}>{t('onboarding_name_title')}</div>
            <div style={s.sub}>{t('onboarding_name_sub')}</div>
          </div>
          {error && <div role="alert" style={s.error}>{error}</div>}
          <form style={s.form} onSubmit={e => { e.preventDefault(); handleCreateAccount(); }}>
            <div style={s.inputFieldsGroup}>
              <div style={s.fieldGroup}>
                <label htmlFor="onboarding-firstname" style={s.label}>{t('onboarding_name_label')}</label>
                <input
                  id="onboarding-firstname"
                  style={s.input}
                  type="text"
                  placeholder={t('onboarding_name_placeholder')}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}

                  autoFocus
                  autoComplete="given-name"
                />
              </div>
              <div style={s.previewGroup}>
                <div style={s.previewLabel}>{t('onboarding_name_preview_label')}</div>
                <div style={s.previewName}>{firstName.trim() || '…'} {houseNumber}</div>
              </div>
            </div>
            <div style={s.ctaGroup}>
              <button
                type="submit"
                style={{ ...s.btn, ...(!firstName.trim() || loading ? s.btnDisabled : {}) }}
                disabled={!firstName.trim() || loading}
              >
                {loading ? t('onboarding_sending') : t('onboarding_send_magic_link')}
              </button>
            </div>
          </form>
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
            <div ref={titleRef} tabIndex={-1} style={s.title}>{t('onboarding_check_email_title')}</div>
            <div style={s.sub}>
              {t('onboarding_check_email_prefix')}{' '}
              <strong style={{ color: COLORS.text }}>{email}</strong>.{' '}
              {t('onboarding_check_email_suffix')}
            </div>
          </div>
          <div style={s.noMailGroup}>
            <span>{t('onboarding_no_mail_q')}</span>
            <span>
              {t('onboarding_no_mail_body')}{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: COLORS.accent, fontSize: 12, lineHeight: '18px', cursor: 'pointer', padding: 0, display: 'inline' }}
                onClick={() => { setStep('login'); setError(''); }}
              >
                {t('onboarding_try_again')}
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
