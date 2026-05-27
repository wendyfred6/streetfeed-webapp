import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
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
