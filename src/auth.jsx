import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, clearToken, getToken, setToken, whenUnauthorized } from './lib/api.js';

// The signed-in user, loaded from GET /api/me.
// This panel is for system administrators: it needs the users.manage permission.
export const ADMIN_PERMISSION = 'users.manage';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const me = await api('/me');
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    return whenUnauthorized(() => setUser(null));
  }, [loadMe]);

  const login = useCallback(async (email, password, remember) => {
    const data = await api('/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(data.token, remember);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api('/logout', { method: 'POST' });
    } catch {
      /* the token may already be gone: sign out locally anyway */
    }
    clearToken();
    setUser(null);
  }, []);

  const can = useCallback((perm) => !!user?.permissions?.includes(perm), [user]);

  const value = useMemo(
    () => ({ user, loading, login, logout, reload: loadMe, setUser, can }),
    [user, loading, login, logout, loadMe, can]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

// Wraps the admin pages: signed in, password already changed, and an administrator.
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-loading" role="status">جارٍ التحقق من الجلسة...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.must_change_password) return <Navigate to="/first-login-password" replace />;
  if (!user.permissions?.includes(ADMIN_PERMISSION)) return <Navigate to="/login" replace state={{ notAdmin: true }} />;
  return children;
}
