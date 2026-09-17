import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setAuthHooks } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('relol_access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('relol_refresh_token'));
  const [userId, setUserId] = useState(() => localStorage.getItem('relol_user_id'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshTokenRef = useRef(refreshToken);
  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  useEffect(() => {
    if (accessToken) localStorage.setItem('relol_access_token', accessToken);
    else localStorage.removeItem('relol_access_token');
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem('relol_refresh_token', refreshToken);
    else localStorage.removeItem('relol_refresh_token');
  }, [refreshToken]);

  useEffect(() => {
    if (userId) localStorage.setItem('relol_user_id', userId);
    else localStorage.removeItem('relol_user_id');
  }, [userId]);

  useEffect(() => {
    setAuthHooks({
      getRefreshToken: () => refreshTokenRef.current,
      onRefreshed: (newAccessToken) => setAccessToken(newAccessToken),
      onRefreshFailed: () => logout(),
    });
  }, []);

  async function signup(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.signup(payload);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUserId(data.userId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function login(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(payload);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUserId(data.userId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
  }

  return (
    <AuthContext.Provider value={{ accessToken, userId, loading, error, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
