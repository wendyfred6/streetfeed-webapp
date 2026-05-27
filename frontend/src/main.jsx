import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import App from './App.jsx';
import AuthPage from './pages/AuthPage.jsx';

function AppRouter() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#E8FF47', fontSize: 24, fontWeight: 800 }}>Street<span style={{ color: '#F0F0F0' }}>feed</span></div>
      </div>
    );
  }

  const membership = user?.memberships?.find(m => m.status === 'approved');
  const isPending = user && !membership && !user.is_super_admin;

  return (
    <Routes>
      <Route path="/auth" element={user && !isPending ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={
        !user ? <Navigate to="/auth" replace /> :
        isPending ? (
          <div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: 400, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 16, padding: '32px 28px', textAlign: 'center', color: '#F0F0F0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Aanvraag ingediend</div>
              <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                De straat admin wordt op de hoogte gesteld en beoordeelt jouw aanvraag zo snel mogelijk.
                Je ontvangt een e-mail zodra je toegang hebt.
              </div>
            </div>
          </div>
        ) : <App />
      } />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
