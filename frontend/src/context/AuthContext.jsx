import React, { createContext, useState, useEffect, useContext } from 'react';
import { LocafyApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login state on load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('locafy_token');
      const storedUser = localStorage.getItem('locafy_user');
      
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token against server
          const data = await LocafyApi.getMe();
          if (data.ok && data.user) {
            setUser(data.user);
            localStorage.setItem('locafy_user', JSON.stringify(data.user));
          }
        } catch (error) {
          console.error('Auth check token verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (identifier, password) => {
    try {
      const data = await LocafyApi.login({ identifier, password });
      if (data.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('locafy_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('locafy_refresh_token', data.refreshToken);
        }
        localStorage.setItem('locafy_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: 'Đăng nhập không thành công.' };
    } catch (err) {
      return { success: false, error: err.data?.error || err.message || 'Lỗi đăng nhập.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('locafy_token');
    localStorage.removeItem('locafy_refresh_token');
    localStorage.removeItem('locafy_user');
  };

  const register = async (userData) => {
    try {
      const data = await LocafyApi.register(userData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.data?.error || err.message || 'Lỗi đăng ký.' };
    }
  };

  const verifyOtp = async (email, code) => {
    try {
      const data = await LocafyApi.verifyOtp({ email, code });
      if (data.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('locafy_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('locafy_refresh_token', data.refreshToken);
        }
        localStorage.setItem('locafy_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: 'Xác thực OTP thất bại.' };
    } catch (err) {
      return { success: false, error: err.data?.error || err.message || 'Lỗi xác thực.' };
    }
  };

  const updateUser = (updatedFields) => {
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    localStorage.setItem('locafy_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, verifyOtp, updateUser }}>
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
