import React from 'react';
import ReactDOM from 'react-dom/client';
import './design/global.css';
import { COLORS } from './design/tokens.js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { isDemoMode } from './api/client.js';
import App from './App.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import PendingPage from './pages/PendingPage.jsx';
import DesignPage from './pages/DesignPage.jsx';

function AppRouter() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.text, fontSize: 24, fontWeight: 800 }}>Street<span style={{ color: COLORS.accent }}>feed</span></div>
      </div>
    );
  }

  const hasAccess = user?.is_super_admin || user?.memberships?.some(m => m.status === 'approved');
  // MVP heeft één straat (zie App.jsx's STREET_ID) — geen memberships betekent
  // in de praktijk niet-mogelijk (registratie maakt er altijd één aan), maar
  // valt hier terug op 'pending' in plaats van een crash.
  const membershipStatus = user?.memberships?.[0]?.status || 'pending';

  return (
    <Routes>
      {/* Magic link token verificatie */}
      <Route path="/auth" element={
        user ? <Navigate to="/" replace /> : <AuthPage />
      } />

      {/* Login + onboarding voor nieuwe gebruikers (enige registratie/login-UI, zie FRE-301) */}
      <Route path="/onboarding" element={
        user ? <Navigate to="/" replace /> : <OnboardingPage />
      } />

      {/* Design systeem — alleen super admin */}
      <Route path="/design" element={
        !user ? <Navigate to="/onboarding" replace /> :
        user?.is_super_admin ? <DesignPage /> :
        <Navigate to="/" replace />
      } />

      {/* Hoofdapp */}
      <Route path="/*" element={
        !user ? <Navigate to="/onboarding" replace /> :
        !hasAccess ? <PendingPage status={membershipStatus} /> :
        <App />
      } />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {isDemoMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#E8FF47', color: '#000',
          fontSize: 10, fontWeight: 800, letterSpacing: '1px',
          textAlign: 'center', padding: '4px 0', textTransform: 'uppercase',
        }}>
          Demo modus — nep data, geen backend nodig
        </div>
      )}
      <div style={isDemoMode ? { paddingTop: 22 } : undefined}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </div>
    </BrowserRouter>
  </React.StrictMode>
);
