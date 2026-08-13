import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, refreshDownloadToken, clearDownloadToken } from './api';
import { normalizeRoleName } from './roleUtils';

const AuthContext = createContext(null);

// The download token lives 30 minutes server-side; renew well inside that so a
// download link is never built from an expired one.
const DOWNLOAD_TOKEN_REFRESH_MS = 20 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      authApi.getMe()
        .then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          refreshDownloadToken();
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          clearDownloadToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const id = setInterval(refreshDownloadToken, DOWNLOAD_TOKEN_REFRESH_MS);
    return () => clearInterval(id);
  }, [user]);

  const login = async (username, password, countryCode = '91') => {
    const response = await authApi.login({ mobile: username, password, country_code: countryCode });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await refreshDownloadToken();
    return userData;
  };

  const loginWithOtp = async (mobile, countryCode, otpCode) => {
    const response = await authApi.verifyLoginOtp({ 
      mobile, 
      country_code: countryCode, 
      otp_code: otpCode,
      purpose: 'login'
    });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await refreshDownloadToken();
    return userData;
  };

  // No self-registration: accounts are created by an Admin or Management user
  // through the User Management screen, and the holder sets their own password
  // via the first-time-setup OTP flow on the login page.

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearDownloadToken();
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const normalizedRole = normalizeRoleName(user.role);
    if (typeof roles === 'string') return normalizedRole === roles;
    return roles.includes(normalizedRole);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithOtp, logout, hasRole }}>
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
