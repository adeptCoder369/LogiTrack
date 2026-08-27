import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, tenantApi, refreshDownloadToken, clearDownloadToken } from './api';
import { normalizeRoleName } from './roleUtils';

const AuthContext = createContext(null);

// The download token lives 30 minutes server-side; renew well inside that so a
// download link is never built from an expired one.
const DOWNLOAD_TOKEN_REFRESH_MS = 20 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTenantConfig = async () => {
    try {
      const { data } = await tenantApi.getConfig();
      setTenant(data);
      return data;
    } catch (e) {
      setTenant(null);
      return null;
    }
  };

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
          loadTenantConfig();
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

  const login = async (username, password, countryCode = '91', tenantSlug = null) => {
    const response = await authApi.login({ mobile: username, password, country_code: countryCode, tenant: tenantSlug || undefined });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await refreshDownloadToken();
    await loadTenantConfig();
    return userData;
  };

  const loginWithOtp = async (mobile, countryCode, otpCode, tenantSlug = null) => {
    const response = await authApi.verifyLoginOtp({
      mobile,
      country_code: countryCode,
      otp_code: otpCode,
      purpose: 'login',
      tenant: tenantSlug || undefined,
    });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    await refreshDownloadToken();
    await loadTenantConfig();
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
    setTenant(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const normalizedRole = normalizeRoleName(user.role);
    if (typeof roles === 'string') return normalizedRole === roles;
    return roles.includes(normalizedRole);
  };

  const isPastDue = !user?.is_master_admin && (tenant?.feature_flags?._billing_past_due === true);
  const isSuspended = !user?.is_master_admin && ((tenant?.tenant?.status && tenant.tenant.status !== 'active') || tenant?.status === 'suspended');

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, loginWithOtp, logout, hasRole, isPastDue, isSuspended }}>
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

export const useTenant = () => {
  const { tenant } = useAuth();
  return tenant;
};
