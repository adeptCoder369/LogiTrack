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
import { Truck, ArrowLeft, Phone, Lock, KeyRound, RefreshCw, UserPlus } from 'lucide-react';

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

  // Login states
  const [loginData, setLoginData] = useState({ 
    mobile: '', 
    password: '', 
    countryCode: '91' 
  });

  // OTP Login states
  const [otpLoginData, setOtpLoginData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    step: 'mobile' // mobile, otp
  });

  // Forgot Password states
  const [forgotData, setForgotData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    step: 'mobile' // mobile, otp, password
  });

  // First-time setup states
  const [firstTimeData, setFirstTimeData] = useState({
    mobile: '',
    countryCode: '91',
    otp: '',
    newPassword: '',
    confirmPassword: '',
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
        password: loginData.password
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
      toast.error(error.response?.data?.detail || 'Login failed');
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
        new_password: firstTimeData.newPassword
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
        country_code: otpLoginData.countryCode
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
      await loginWithOtp(otpLoginData.mobile, otpLoginData.countryCode, otpLoginData.otp);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
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
        country_code: forgotData.countryCode
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
        new_password: forgotData.newPassword
      });
      toast.success('Password reset successfully! Please login.');
      setActiveView('main');
      setForgotData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', step: 'mobile' });
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
          password: '' // Empty password triggers OTP for first-time users
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
        src="https://customer-assets.emergentagent.com/job_delivery-hub-237/artifacts/gckg95ms_Info%20Eight_su_5a.png" 
        alt="InfoEIGHT" 
        className="h-16 mx-auto mb-4"
      />
      <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-3">
        <Truck className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
        LogiTrack Pro
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
            Resend in <span className="text-orange-500 font-medium">{formatTime(otpTimer)}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => handleResendOtp(purpose)}
            className="text-orange-500 hover:text-orange-400 flex items-center"
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
        <CardTitle style={{ fontFamily: 'Manrope' }}>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          {renderMobileInput(loginData, setLoginData, 'login-')}
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
            className="w-full bg-slate-900 hover:bg-slate-800"
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
            className="w-full text-sm text-orange-600 hover:text-orange-500 flex items-center justify-center"
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
        {renderBackButton('main', () => setOtpLoginData({ mobile: '', countryCode: '91', otp: '', step: 'mobile' }))}
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
            <Button 
              onClick={handleRequestLoginOtp}
              className="w-full bg-orange-500 hover:bg-orange-600"
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
              className="w-full bg-orange-500 hover:bg-orange-600"
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
        {renderBackButton('main', () => setForgotData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', step: 'mobile' }))}
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
            <Button 
              onClick={handleForgotPasswordSendOtp}
              className="w-full bg-orange-500 hover:bg-orange-600"
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
              className="w-full bg-orange-500 hover:bg-orange-600"
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
              className="w-full bg-orange-500 hover:bg-orange-600"
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
          className="w-full bg-orange-500 hover:bg-orange-600"
          disabled={loading}
          data-testid="first-time-setup-submit"
        >
          {loading ? 'Setting up...' : 'Set Password & Login'}
        </Button>
        
        <button
          type="button"
          onClick={() => {
            setActiveView('main');
            setFirstTimeData({ mobile: '', countryCode: '91', otp: '', newPassword: '', confirmPassword: '', demoOtp: '' });
          }}
          className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2"
        >
          Back to Login
        </button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderHeader()}
        
        {activeView === 'main' && renderMainLogin()}
        {activeView === 'loginOtp' && renderLoginOtp()}
        {activeView === 'forgotPassword' && renderForgotPassword()}
        {activeView === 'firstTimeSetup' && renderFirstTimeSetup()}

        <p className="text-center text-slate-500 mt-6 text-sm">
          LogiTrack Pro v2.1 | InfoEIGHT Solutions
        </p>
      </div>
    </div>
  );
}
