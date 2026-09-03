import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Truck, ArrowLeft, Phone, Lock, KeyRound, RefreshCw, UserPlus, ShieldCheck, Package, Warehouse, BarChart3, Building2, ArrowRightLeft } from 'lucide-react';

const COUNTRY_CODES = [
  { code: "91", name: "India", flag: "🇮🇳" },
  { code: "977", name: "Nepal", flag: "🇳🇵" },
  { code: "880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "84", name: "Vietnam", flag: "🇻🇳" },
  { code: "975", name: "Bhutan", flag: "🇧🇹" },
  { code: "971", name: "UAE", flag: "🇦🇪" },
];

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 120;

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('main'); // main, loginOtp, forgotPassword, firstTimeSetup
  const [loginMode, setLoginMode] = useState('workspace'); // 'workspace' | 'platform'
  const isPlatform = loginMode === 'platform';
  // Platform owner never sends a tenant; workspace users send their company code
  const effTenant = (t) => (isPlatform ? undefined : (t && t.trim() ? t.trim().toLowerCase() : undefined));
  const switchMode = (mode) => {
    setLoginMode(mode);
    setLoginData(d => ({ ...d, tenant: '' }));
    setOtpLoginData(d => ({ ...d, tenant: '' }));
    setForgotData(d => ({ ...d, tenant: '' }));
    setFirstTimeData(d => ({ ...d, tenant: '' }));
  };
  const friendlyLoginError = (error, fallback) => {
    const detail = error.response?.data?.detail || fallback;
    if (!isPlatform && /more than one workspace/i.test(detail)) {
      return 'This number is used in more than one company — please enter your company code.';
    }
    return detail;
  };
  const renderModeTabs = () => (
    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-4">
      <button
        type="button"
        onClick={() => switchMode('workspace')}
        data-testid="login-tab-workspace"
        className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${!isPlatform ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Building2 className="w-4 h-4" />
        Company login
      </button>
      <button
        type="button"
        onClick={() => switchMode('platform')}
        data-testid="login-tab-platform"
        className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${isPlatform ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <ShieldCheck className="w-4 h-4" />
        Platform owner
      </button>
    </div>
  );

  // Login states
  const [loginData, setLoginData] = useState({
    mobile: '',
    password: '',
    countryCode: '91',
    tenant: ''
  });

  // OTP Login states
  const [otpLoginData, setOtpLoginData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    tenant: '',
    step: 'mobile' // mobile, otp
  });

  // Forgot Password states
  const [forgotData, setForgotData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    tenant: '',
    step: 'mobile' // mobile, otp, password
  });

  // First-time setup states
  const [firstTimeData, setFirstTimeData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    tenant: '',
    demoOtp: ''
  });

  // OTP timer
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);

  // Start OTP timer
  const startOtpTimer = () => {
    setOtpTimer(OTP_EXPIRY_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Password Login Handler
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!loginData.mobile || !loginData.password) {
      toast.error('Please enter mobile number and password');
      return;
    }
    if (loginData.mobile.length !== 10) {
      toast.error('Mobile number must be 10 digits');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.login({
        mobile: loginData.mobile,
        country_code: loginData.countryCode,
        password: loginData.password,
        tenant: effTenant(loginData.tenant)
      });

      // Check if this is a first-time login
      if (response.data.first_time_login) {
        toast.info(response.data.message);
        setFirstTimeData({
          mobile: loginData.mobile,
          countryCode: loginData.countryCode,
          otp: '',
          newPassword: '',
          confirmPassword: '',
          tenant: loginData.tenant,
          demoOtp: response.data.demo_otp || ''
        });
        setActiveView('firstTimeSetup');
        startOtpTimer();
      } else {
        // Regular login
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Login successful!');
        navigate('/');
        window.location.reload(); // Force refresh to update auth state
      }
    } catch (error) {
      toast.error(friendlyLoginError(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  // First-time password setup
  const handleFirstTimeSetup = async () => {
    if (!firstTimeData.otp || firstTimeData.otp.length !== OTP_LENGTH) {
      toast.error(`Please enter ${OTP_LENGTH}-digit OTP`);
      return;
    }
    if (!firstTimeData.newPassword || firstTimeData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (firstTimeData.newPassword !== firstTimeData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.firstTimeSetup({
        mobile: firstTimeData.mobile,
        country_code: firstTimeData.countryCode,
        otp_code: firstTimeData.otp,
        new_password: firstTimeData.newPassword,
        tenant: effTenant(firstTimeData.tenant)
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      toast.success('Password set successfully! Welcome!');
      navigate('/');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  // OTP Login Handlers
  const handleRequestLoginOtp = async () => {
    if (!otpLoginData.mobile || otpLoginData.mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.requestLoginOtp({
        mobile: otpLoginData.mobile,
        country_code: otpLoginData.countryCode,
        tenant: effTenant(otpLoginData.tenant)
      });
      toast.success(response.data.message);
      setOtpLoginData(prev => ({ ...prev, step: 'otp' }));
      startOtpTimer();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async () => {
    if (!otpLoginData.otp || otpLoginData.otp.length !== OTP_LENGTH) {
      toast.error(`Please enter ${OTP_LENGTH}-digit OTP`);
      return;
    }
    setLoading(true);
    try {
      await loginWithOtp(otpLoginData.mobile, otpLoginData.countryCode, otpLoginData.otp, effTenant(otpLoginData.tenant));
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(friendlyLoginError(error, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Handlers
  const handleForgotPasswordSendOtp = async () => {
    if (!forgotData.mobile || forgotData.mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.forgotPassword({
        mobile: forgotData.mobile,
        country_code: forgotData.countryCode,
        tenant: effTenant(forgotData.tenant)
      });
      toast.success(response.data.message);
      setForgotData(prev => ({ ...prev, step: 'otp' }));
      startOtpTimer();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerifyOtp = async () => {
    if (!forgotData.otp || forgotData.otp.length !== OTP_LENGTH) {
      toast.error(`Please enter ${OTP_LENGTH}-digit OTP`);
      return;
    }
    setForgotData(prev => ({ ...prev, step: 'password' }));
  };

  const handleResetPassword = async () => {
    if (!forgotData.newPassword || forgotData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({
        mobile: forgotData.mobile,
        country_code: forgotData.countryCode,
        otp_code: forgotData.otp,
        new_password: forgotData.newPassword,
        tenant: effTenant(forgotData.tenant)
      });
      toast.success('Password reset successfully! Please login.');
      setActiveView('main');
      setForgotData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', tenant: '', step: 'mobile' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (purpose) => {
    if (otpTimer > 0) return;

    let mobile, countryCode;
    if (purpose === 'login') {
      mobile = otpLoginData.mobile;
      countryCode = otpLoginData.countryCode;
    } else if (purpose === 'reset_password') {
      mobile = forgotData.mobile;
      countryCode = forgotData.countryCode;
      } else if (purpose === 'first_time_setup') {
      // Re-trigger login to get new OTP
      setLoading(true);
      try {
        const response = await authApi.login({
          mobile: firstTimeData.mobile,
          country_code: firstTimeData.countryCode,
          password: '', // Empty password triggers OTP for first-time users
          tenant: effTenant(firstTimeData.tenant)
        });
        if (response.data.first_time_login) {
          toast.success(response.data.message);
          setFirstTimeData(prev => ({ ...prev, demoOtp: response.data.demo_otp || '' }));
          startOtpTimer();
        }
      } catch (error) {
        toast.error('Failed to resend OTP');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resendOtp({
        mobile,
        country_code: countryCode,
        purpose
      });
      toast.success(response.data.message);
      startOtpTimer();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <div className="text-center mb-8">
     
      <img
        src='icons/icon-512.webp'
        alt='IBRMCO Logo'
        className='h-16 mx-auto mb-4 rounded-full border-2 border-slate-700'
      />
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
        IBRMCO   Pro
      </h1>
      <p className="text-slate-400 mt-1 text-sm">Powered by InfoEIGHT</p>
    </div>
  );

  const renderBackButton = (view, resetFn) => (
    <button
      onClick={() => {
        setActiveView(view);
        if (resetFn) resetFn();
      }}
      className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      Back
    </button>
  );

  const renderMobileInput = (data, setData, prefix = '') => (
    <div className="space-y-2">
      <Label htmlFor={`${prefix}mobile`}>Mobile Number</Label>
      <div className="flex gap-2">
        <Select
          value={data.countryCode}
          onValueChange={(value) => setData({ ...data, countryCode: value })}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} +{c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id={`${prefix}mobile`}
            value={data.mobile}
            onChange={(e) => setData({ ...data, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10-digit mobile"
            className="pl-10"
            maxLength={10}
            data-testid={`${prefix}mobile`}
          />
        </div>
      </div>
    </div>
  );

  const renderTenantInput = (data, setData, prefix = '') => {
    if (isPlatform) return null;
    return (
      <div className="space-y-2">
        <Label htmlFor={`${prefix}tenant`}>
          Company code <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`${prefix}tenant`}
          value={data.tenant}
          onChange={(e) => setData({ ...data, tenant: e.target.value.trim().toLowerCase() })}
          placeholder="e.g. acme"
          className="pl-10"
          data-testid={`${prefix}tenant`}
        />
        <p className="text-xs text-slate-500">
          The short code for your company — your admin gives this to you.
        </p>
      </div>
    );
  };

  const renderOtpInput = (value, onChange, purpose) => (
    <div className="space-y-2">
      <Label htmlFor={`${purpose}-otp`}>Enter OTP</Label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          id={`${purpose}-otp`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          placeholder={`Enter ${OTP_LENGTH}-digit OTP`}
          className="pl-10 text-center tracking-[0.5em] font-mono text-lg"
          maxLength={OTP_LENGTH}
          data-testid={`${purpose}-otp`}
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        {otpTimer > 0 ? (
          <span className="text-slate-500">
            Resend in <span className="text-accent-brand font-medium">{formatTime(otpTimer)}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleResendOtp(purpose)}
            className="text-accent-brand hover:text-accent-brand/80 flex items-center"
            disabled={loading}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );

  // Main Login View
  const renderMainLogin = () => (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        {renderModeTabs()}
        <CardTitle style={{ fontFamily: 'Manrope' }}>{isPlatform ? 'Platform Sign In' : 'Welcome Back'}</CardTitle>
        <CardDescription>{isPlatform ? 'Owner sign-in — manages all companies' : 'Sign in to your company workspace'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          {renderMobileInput(loginData, setLoginData, 'login-')}
          {renderTenantInput(loginData, setLoginData, 'login-')}
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Enter password"
                className="pl-10"
                data-testid="login-password"
              />
            </div>
            <p className="text-xs text-slate-500">
              First time? Enter any password to receive OTP
            </p>
          </div>
          <Button
            type="submit"
            className="w-full bg-brand hover:bg-brand/90 text-primary-foreground"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => setActiveView('loginOtp')}
            className="w-full text-sm text-accent-brand hover:text-accent-brand/80 flex items-center justify-center"
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Login with OTP
          </button>
          <button
            type="button"
            onClick={() => setActiveView('forgotPassword')}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-center text-slate-400">
            <UserPlus className="w-3 h-3 inline mr-1" />
            Contact your Admin to create an account
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Login with OTP View
  const renderLoginOtp = () => (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        {renderBackButton('main', () => setOtpLoginData({ mobile: '', countryCode: '91', otp: '', tenant: '', step: 'mobile' }))}
        {renderModeTabs()}
        <CardTitle style={{ fontFamily: 'Manrope' }}>Login with OTP</CardTitle>
        <CardDescription>
          {otpLoginData.step === 'mobile'
            ? 'Enter your registered mobile number'
            : `Enter OTP sent to +${otpLoginData.countryCode}${otpLoginData.mobile}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {otpLoginData.step === 'mobile' ? (
          <>
            {renderMobileInput(otpLoginData, setOtpLoginData, 'otpLogin-')}
            {renderTenantInput(otpLoginData, setOtpLoginData, 'otpLogin-')}
            <Button
              onClick={handleRequestLoginOtp}
              className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
              disabled={loading}
              data-testid="request-login-otp"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </>
        ) : (
          <>
            {renderOtpInput(otpLoginData.otp, (val) => setOtpLoginData(prev => ({ ...prev, otp: val })), 'login')}
            <Button
              onClick={handleVerifyLoginOtp}
              className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
              disabled={loading}
              data-testid="verify-login-otp"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  // Forgot Password View
  const renderForgotPassword = () => (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        {renderBackButton('main', () => setForgotData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', tenant: '', step: 'mobile' }))}
        {renderModeTabs()}
        <CardTitle style={{ fontFamily: 'Manrope' }}>Reset Password</CardTitle>
        <CardDescription>
          {forgotData.step === 'mobile' && 'Enter your registered mobile number'}
          {forgotData.step === 'otp' && `Enter OTP sent to +${forgotData.countryCode}${forgotData.mobile}`}
          {forgotData.step === 'password' && 'Create your new password'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {forgotData.step === 'mobile' && (
          <>
            {renderMobileInput(forgotData, setForgotData, 'forgot-')}
            {renderTenantInput(forgotData, setForgotData, 'forgot-')}
            <Button
              onClick={handleForgotPasswordSendOtp}
              className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
              disabled={loading}
              data-testid="forgot-send-otp"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </>
        )}

        {forgotData.step === 'otp' && (
          <>
            {renderOtpInput(forgotData.otp, (val) => setForgotData(prev => ({ ...prev, otp: val })), 'reset_password')}
            <Button
              onClick={handleForgotPasswordVerifyOtp}
              className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
              disabled={loading}
              data-testid="forgot-verify-otp"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </>
        )}

        {forgotData.step === 'password' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="new-password"
                  type="password"
                  value={forgotData.newPassword}
                  onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                  placeholder="Min 6 characters"
                  className="pl-10"
                  data-testid="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={forgotData.confirmPassword}
                  onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="pl-10"
                  data-testid="confirm-password"
                />
              </div>
            </div>
            <Button
              onClick={handleResetPassword}
              className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
              disabled={loading}
              data-testid="reset-password-submit"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  // First-time Setup View
  const renderFirstTimeSetup = () => (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle style={{ fontFamily: 'Manrope' }}>Welcome!</CardTitle>
        <CardDescription>
          An OTP has been sent to +{firstTimeData.countryCode}{firstTimeData.mobile}.
          <br />Please verify and set your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderOtpInput(firstTimeData.otp, (val) => setFirstTimeData(prev => ({ ...prev, otp: val })), 'first_time_setup')}

        <div className="space-y-2">
          <Label htmlFor="setup-password">Create Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="setup-password"
              type="password"
              value={firstTimeData.newPassword}
              onChange={(e) => setFirstTimeData({ ...firstTimeData, newPassword: e.target.value })}
              placeholder="Min 6 characters"
              className="pl-10"
              data-testid="setup-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="setup-confirm-password"
              type="password"
              value={firstTimeData.confirmPassword}
              onChange={(e) => setFirstTimeData({ ...firstTimeData, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="pl-10"
              data-testid="setup-confirm-password"
            />
          </div>
        </div>

        <Button
          onClick={handleFirstTimeSetup}
          className="w-full bg-accent-brand hover:bg-accent-brand/90 text-accent-foreground"
          disabled={loading}
          data-testid="first-time-setup-submit"
        >
          {loading ? 'Setting up...' : 'Set Password & Login'}
        </Button>

        <button
          type="button"
          onClick={() => {
            setActiveView('main');
            setFirstTimeData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', tenant: '', demoOtp: '' });
          }}
          className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2"
        >
          Back to Login
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Brand / Story (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[52%] brand-gradient relative flex-col justify-between p-10 xl:p-14 text-white overflow-hidden">
        {/* subtle pattern */}
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: 'Manrope' }}>IBRMCO Pro</span>
            <span className="ml-2 px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold tracking-wider">v2.1</span>
          </div>
          <h1 className="text-4xl xl:text-[42px] font-extrabold leading-tight" style={{ fontFamily: 'Manrope' }}>
            Logistics,<br />Unified.
          </h1>
          <p className="mt-4 text-white/80 text-sm xl:text-[15px] leading-relaxed max-w-md">
            Multi-tenant SaaS for depots, inventory, dispatches and billing — one workspace per client, one login per role.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 max-w-sm">
            {[
              { icon: Warehouse, label: 'Inventory Wallet', desc: 'Real-time depot & company stock' },
              { icon: ArrowRightLeft, label: 'Stock Transfers', desc: 'Depot ↔ Company with approvals' },
              { icon: Building2, label: 'Tenants & Branding', desc: 'Workspace + primary/accent per client' },
              { icon: ShieldCheck, label: 'Role-based Access', desc: 'Products / Depots / Tenants scoped' },
            ].map(item => (
              <div key={item.label} className="flex gap-3 items-center bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-slate-900" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{item.label}</p>
                  <p className="text-xs text-white/70 leading-none mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60">
          <span>Powered by InfoEIGHT</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Secure</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50">
        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-2.5 mb-6 w-full max-w-md">
          <div className="w-9 h-9 brand-gradient rounded-xl flex items-center justify-center shadow">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-widest uppercase text-slate-900" style={{ fontFamily: 'Manrope' }}>IBRMCO Pro</p>
            <p className="text-xs text-slate-500">Powered by InfoEIGHT</p>
          </div>
        </div>
        <div className="w-full max-w-md">
          {/* subtle mode hint */}
          <div className="mb-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded-full bg-white border text-slate-600">
              {isPlatform
                ? 'Platform owner — no company code needed'
                : 'Company staff — log in with the mobile your admin registered'}
            </span>
          </div>
          {activeView === 'main' && renderMainLogin()}
          {activeView === 'loginOtp' && renderLoginOtp()}
          {activeView === 'forgotPassword' && renderForgotPassword()}
          {activeView === 'firstTimeSetup' && renderFirstTimeSetup()}
          <p className="text-center text-slate-400 mt-6 text-xs">
            IBRMCO v2.1 • InfoEIGHT Solutions 
          </p>
        </div>
      </div>
    </div>
  );
}
