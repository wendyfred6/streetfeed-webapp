import { useAuth } from '../hooks/useAuth.jsx';
import { t } from '../i18n/index.js';
import { COLORS } from '../design/tokens.js';

const s = {
  page: { minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: '32px 28px', textAlign: 'center' },
  title: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  body: { fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 20 },
  logoutBtn: { background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0 },
};

// Getoond aan een ingelogde gebruiker zonder goedgekeurd lidmaatschap — zie
// main.jsx routing. status komt uit user.memberships[x].status (FRE-304).
export default function PendingPage({ status = 'pending' }) {
  const { logout } = useAuth();
  const rejected = status === 'rejected';

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>{t(rejected ? 'rejected_title' : 'pending_title')}</div>
        <div style={s.body}>{t(rejected ? 'rejected_body' : 'pending_body')}</div>
        <button style={s.logoutBtn} onClick={logout}>{t('logout')}</button>
      </div>
    </div>
  );
}
