import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('relol_access_token'));
  const [userId, setUserId] = useState(() => localStorage.getItem('relol_user_id'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (accessToken) localStorage.setItem('relol_access_token', accessToken);
    else localStorage.removeItem('relol_access_token');
  }, [accessToken]);

  useEffect(() => {
    if (userId) localStorage.setItem('relol_user_id', userId);
    else localStorage.removeItem('relol_user_id');
  }, [userId]);

  async function signup(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.signup(payload);
      setAccessToken(data.accessToken);
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
