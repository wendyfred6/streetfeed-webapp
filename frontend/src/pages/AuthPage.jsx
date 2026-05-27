import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { t } from '../i18n/index.js';

const COLORS = {
  bg: '#0F0F0F', surface: '#1A1A1A', border: '#2A2A2A',
  accent: '#E8FF47', text: '#F0F0F0', textMuted: '#888888',
  red: '#FF4444',
};

const s = {
  page: { minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '32px 28px' },
  logo: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28, lineHeight: 1.5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: COLORS.textMuted, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '12px 14px', color: COLORS.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  btn: { width: '100%', background: COLORS.accent, color: '#000', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 4 },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12 },
  success: { textAlign: 'center', padding: '8px 0' },
  successTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  successBody: { fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 },
  divider: { borderTop: `1px solid ${COLORS.border}`, margin: '20px 0' },
  pendingBox: { background: `rgba(232,255,71,0.06)`, border: `1px solid rgba(232,255,71,0.2)`, borderRadius: 10, padding: '14px 16px', fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 12 },
};

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [house, setHouse] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const errorParam = params.get('error');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/request', {
        email: email.trim(),
        name: name.trim() || undefined,
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

  // After redirect back from verify, reload user
  useEffect(() => {
    if (params.get('auth') === 'ok') {
      refresh().then(() => navigate('/'));
    }
  }, []);

  if (sent) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.success}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
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
        <div style={s.logo}>Street<span style={{ color: COLORS.accent }}>feed</span></div>
        <p style={s.subtitle}>{t('login_subtitle')}</p>

        {errorParam === 'expired' && (
          <p style={s.error}>De link is verlopen. Vraag een nieuwe aan.</p>
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

              <label style={s.label}>{t('new_user_name')}</label>
              <input
                style={s.input}
                type="text"
                placeholder={t('new_user_name_placeholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                required={needsProfile}
              />

              <label style={s.label}>{t('new_user_house')}</label>
              <input
                style={s.input}
                type="text"
                placeholder={t('new_user_house_placeholder')}
                value={house}
                onChange={e => setHouse(e.target.value)}
              />
            </>
          )}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? t('loading') : t('send_link')}
          </button>
        </form>
      </div>
    </div>
  );
}
