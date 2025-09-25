import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner';

// Twilio config from env
const TWILIO_ACCOUNT_SID = process.env.REACT_APP_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.REACT_APP_TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.REACT_APP_TWILIO_VERIFY_SERVICE_SID;

const LoginPage = () => {
  const { login } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demoCredentials, setDemoCredentials] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Load demo credentials for development
    loadDemoCredentials();
  }, []);

  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const loadDemoCredentials = async () => {
    try {
      const result = await authService.getDemoCredentials();
      if (result.success) {
        setDemoCredentials(result);
      }
    } catch (error) {
      console.error('Failed to load demo credentials:', error);
    }
  };

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.startsWith('+')) return digits;
    return digits.length > 0 ? `+${digits}` : '';
  };

  // --- TWILIO OTP LOGIC ---
  const sendOtpTwilio = async (formattedPhone) => {
    try {
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Channel: 'sms',
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
      return { success: true, message: 'OTP sent successfully via Twilio' };
    } catch (err) {
      console.error('Twilio send OTP error:', err);
      return { success: false, error: err.message };
    }
  };

  const verifyOtpTwilio = async (formattedPhone, otpCode) => {
    try {
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Code: otpCode,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.status !== 'approved')
        throw new Error(data.message || 'Invalid OTP');
      return { success: true };
    } catch (err) {
      console.error('Twilio verify OTP error:', err);
      return { success: false, error: err.message };
    }
  };
  // --- END TWILIO OTP LOGIC ---

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone || formattedPhone.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }

      // Send OTP via Twilio instead of authService
      const result = await sendOtpTwilio(formattedPhone);

      if (result.success) {
        setPhone(formattedPhone);
        setStep('otp');
        setOtpSent(true);
        setResendCooldown(60);
        setSuccess(result.message);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP');
        return;
      }

      // Verify OTP via Twilio
      const result = await verifyOtpTwilio(phone, otp);

      if (result.success) {
        // Optional: Call Supabase login if needed
        const supaResult = await login(phone, otp);
        if (supaResult.success) {
          setSuccess('Login successful!');
        } else {
          setError(supaResult.error || 'Login via Supabase failed');
        }
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const result = await sendOtpTwilio(phone);
      if (result.success) {
        setResendCooldown(60);
        setSuccess('OTP resent successfully!');
      } else {
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleUseDemoAccount = async () => {
    if (!demoCredentials) return;
  
    try {
      setLoading(true);
      setError('');
      setSuccess('');
  
      // Pretend Twilio already verified
      setPhone(demoCredentials.demo_phone);
      setOtp(demoCredentials.demo_otp);
  
      // Try Supabase login with demo creds
      try {
        const supaResult = await login(demoCredentials.demo_phone, demoCredentials.demo_otp);
        if (supaResult.success) {
          setSuccess('Logged in with demo account!');
          // 🔑 You might want to redirect here after login
          // navigate('/dashboard');
        } else {
          setError(supaResult.error || 'Demo login failed (Supabase)');
        }
      } catch (err) {
        console.warn('Supabase not available, faking success login for demo');
        setSuccess('Demo login successful (mock)');
        // navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };
  

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setSuccess('');
    setOtpSent(false);
  };

  if (loading && step === 'phone') {
    return <LoadingSpinner message="Sending OTP..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">💪</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            AI Fitness Trainer
          </h2>
          <p className="text-blue-200">
            Your personal AI-powered fitness companion
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending OTP...
                  </div>
                ) : (
                  'Send OTP'
                )}
              </button>

              {/* Demo Account Button */}
              {demoCredentials && (
                <button
                  type="button"
                  onClick={handleUseDemoAccount}
                  className="w-full bg-white/20 text-white py-3 px-4 rounded-lg font-medium hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
                >
                  Use Demo Account
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-white mb-2">
                  Enter OTP
                </label>
                <p className="text-blue-200 text-sm mb-3">
                  We sent a 6-digit code to {phone}
                </p>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength="6"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="text-blue-200 hover:text-white transition-colors duration-200"
                >
                  ← Change Phone
                </button>
                
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-blue-200 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="text-center space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🏋️</div>
              <p className="text-blue-200 text-xs">AI Workouts</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-blue-200 text-xs">Progress Tracking</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-blue-200 text-xs">Personal Plans</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
