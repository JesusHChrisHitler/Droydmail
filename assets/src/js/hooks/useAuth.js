import { useState, useEffect } from 'react';
import { fetchCSRF, authApi } from '../api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await fetchCSRF();
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  const login = async (username, password, captcha) => {
    const user = await authApi.login(username, password, captcha);
    setUser(user);
    return user;
  };

  const register = async (username, password, email, captcha) => {
    await authApi.register(username, password, email, captcha);
  };

  const verify = async (username, code) => {
    const user = await authApi.verify(username, code);
    setUser(user);
    return user;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const updateRole = (role) => {
    if (user) setUser({ ...user, role });
  };

  return { user, loading, login, register, verify, logout, updateRole };
}