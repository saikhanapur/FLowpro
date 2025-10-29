import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount ONLY
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password);
      localStorage.setItem('auth_token', data.access_token);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      return data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const signup = async (email, password, name) => {
    try {
      const data = await api.signup(email, password, name);
      localStorage.setItem('auth_token', data.access_token);
      setUser(data.user);
      toast.success(`Welcome to FlowForge, ${data.user.name}!`);
      return data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Signup failed';
      toast.error(message);
      throw error;
    }
  };

  const loginWithGoogle = async (sessionId) => {
    try {
      const data = await api.googleSession(sessionId);
      localStorage.setItem('auth_token', data.access_token);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      return data;
    } catch (error) {
      const message = error.response?.data?.detail || 'Google login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    loginWithGoogle,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
