import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);
const USER_KEY = 'sorteo.admin.user';

const loadUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
};
const saveUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const logout = useCallback(() => {
    setToken(null);
    saveUser(null);
    setUser(null);
  }, []);

  const login = useCallback(
    async (dni) => {
      const check = await api('/auth/check', { method: 'POST', body: { dni }, auth: false });
      if (!check.exists) {
        throw new Error('Ese DNI no está registrado.');
      }
      const session = await api('/auth/login', { method: 'POST', body: { dni }, auth: false });
      if (session.user?.role !== 'admin') {
        throw new Error('Este DNI no tiene permisos de administrador.');
      }
      setToken(session.token);
      saveUser(session.user);
      setUser(session.user);
      return session.user;
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user) && Boolean(getToken()),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de <AuthProvider>');
  return ctx;
}
