import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    // Timeout van 8s zodat de app op iOS niet eeuwig in de laadstatus hangt
    // als de fetch niet reageert (bijv. bij openen vanuit een andere app).
    const timer = setTimeout(() => setUser(null), 8000);
    api.get('/auth/me')
      .then(data => { clearTimeout(timer); setUser(data); })
      .catch(() => { clearTimeout(timer); setUser(null); });
    return () => clearTimeout(timer);
  }, []);

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  };

  const refresh = () => api.get('/auth/me').then(setUser).catch(() => setUser(null));

  return (
    <AuthContext.Provider value={{ user, setUser, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
