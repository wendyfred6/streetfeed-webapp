import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { COLORS, RADIUS, GLASS } from '../design/tokens.js';

const s = {
  page: { minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, ...GLASS.card, borderRadius: RADIUS.xl, padding: '32px 28px' },
  success: { textAlign: 'center', padding: '8px 0' },
  successTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8, color: COLORS.text },
  successBody: { fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 },
};

// Dit is uitsluitend de magic-link callback route (/auth?token=...). Het volledige
// login/registratie-formulier leeft in OnboardingPage — zie FRE-301.
export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const tokenParam = params.get('token');

  useEffect(() => {
    if (!tokenParam) {
      navigate('/onboarding', { replace: true });
      return;
    }
    api.get(`/auth/verify?token=${encodeURIComponent(tokenParam)}`)
      .then(() => refresh().then(() => navigate('/', { replace: true })))
      .catch((err) => {
        const code = err?.data?.error;
        const authError = code === 'expired'
          ? 'De link is verlopen. Vraag een nieuwe aan.'
          : 'Verificatie mislukt. Probeer opnieuw.';
        navigate('/onboarding', { replace: true, state: { authError } });
      });
  }, []);

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
