// DFD 1.0 - Authentication State Context Provider
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);

  // Load session on startup if token exists
  useEffect(() => {
    async function loadUser() {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const res = await authApi.getCurrentUser();
          setUser(res.user);
        } catch (err) {
          console.error("Session expired or invalid token:", err);
          removeAuthToken();
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const isCitizen = user?.role === 'citizen';
  const isOfficer = user?.role === 'officer';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isCitizen,
        isOfficer,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
