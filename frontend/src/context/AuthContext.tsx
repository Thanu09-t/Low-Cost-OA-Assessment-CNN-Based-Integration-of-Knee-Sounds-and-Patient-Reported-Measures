import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

interface UserSession {
  email: string;
  role: 'patient' | 'doctor';
  name: string;
  token: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userDetails: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on initial mount
    const savedToken = localStorage.getItem('oa_insight_token');
    const savedRole = localStorage.getItem('oa_insight_role') as 'patient' | 'doctor';
    const savedEmail = localStorage.getItem('oa_insight_email');
    const savedName = localStorage.getItem('oa_insight_name');

    if (savedToken && savedRole && savedEmail && savedName) {
      setUser({
        token: savedToken,
        role: savedRole,
        email: savedEmail,
        name: savedName
      });
    }
    setLoading(false);
  }, []);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const session: UserSession = {
        token: data.access_token,
        role: data.role as 'patient' | 'doctor',
        email: data.email,
        name: data.name
      };

      localStorage.setItem('oa_insight_token', session.token);
      localStorage.setItem('oa_insight_role', session.role);
      localStorage.setItem('oa_insight_email', session.email);
      localStorage.setItem('oa_insight_name', session.name);

      setUser(session);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userDetails: any) => {
    setLoading(true);
    try {
      await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userDetails),
      });
      // Automatically login after signup
      await login({ email: userDetails.email, password: userDetails.password });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('oa_insight_token');
    localStorage.removeItem('oa_insight_role');
    localStorage.removeItem('oa_insight_email');
    localStorage.removeItem('oa_insight_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
