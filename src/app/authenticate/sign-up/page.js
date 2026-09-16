"use client";

import React, { useEffect, useState, useRef } from 'react';
import { SignUpAction,sendOtp,verifyOtp } from '@/action';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpWithOTP() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    otp: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP send / resend state
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // seconds remaining
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const timerRef = useRef(null);

  // helper to start 60s cooldown
  const startResendCooldown = (seconds = 60) => {
    setResendTimer(seconds);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // send-otp: calls backend sendOtp (implement on server)
  const sendOtpLocal = async () => {
    setError('');
    if (!formData.email) {
      setError('Please provide an email to send OTP to.');
      return;
    }

    try {
      setSendingOtp(true);
 
      const res = await sendOtp(formData.email);

      if (res.success) {
        setOtpSent(true);
        startResendCooldown(60); // 60s timeout for resend
      } else {
        setError(res?.message || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error while sending OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  // optional: verify OTP separately (calls '/api/verify-otp')
  const verifyOtpLocal = async () => {
    setError('');
    if (!formData.email || !formData.otp) {
      setError('Please enter both email and OTP to verify.');
      return false;
    }

    try {
      const res = await verifyOtp(formData.email, formData.otp);
      if (res.success) {
        setIsOtpVerified(true);
        return true;
      } else {
        setError(data?.message || 'OTP verification failed.');
        return false;
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error while verifying OTP.');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // It's common to require OTP verification before final signup. You can either
      // (A) verify on the server as part of SignUpAction (recommended), or
      // (B) call verifyOtpLocal() here before calling SignUpAction. Below we'll attempt (B)
      // so users get quick feedback. Remove this block if your SignUpAction already
      // validates OTP server-side.

      if (!otpSent) {
        setError('Please send OTP to your email and enter it before signing up.');
        setLoading(false);
        return;
      }

      const otpOk = await verifyOtpLocal();
      if (!otpOk) {
        setLoading(false);
        return;
      }

      // call your existing SignUpAction — ensure it accepts otp if needed
      const response = await SignUpAction({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        otp: formData.otp
      });

      if (response?.success) {
        router.push('/authenticate/sign-in');
      } else {
        setError(response?.message || 'Failed to create account.');
        console.log(response);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create an Account</h1>
          <p className="text-gray-600 mt-2">Join the Pulse Social & Creator Network</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your email"
              />

              <button
                type="button"
                onClick={sendOtpLocal}
                disabled={sendingOtp || resendTimer > 0}
                className={`px-4 py-2 rounded-lg font-medium border ${sendingOtp || resendTimer > 0 ? 'opacity-60 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {sendingOtp ? 'Sending...' : (resendTimer > 0 ? `Resend in ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,'0')}` : (otpSent ? 'Resend OTP' : 'Send OTP'))}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">We'll send a one-time code to your email. Resend allowed after 60s.</p>
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Enter OTP
            </label>
            <div className="flex gap-2">
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                // pattern="\\d*"
                value={formData.otp}
                onChange={(e)=>{handleChange(e); setIsOtpVerified(false);}}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="6-digit code"
              />
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  const ok = await verifyOtpLocal();
                  if (ok) {
                    // small visual feedback — done via alert here; replace with toast if you have one
                    // NOTE: do not block signup; this is just an optional pre-verification step
                    alert('OTP verified successfully. You can now complete sign up.');
                  }
                  else{
                    alert('OTP verification failed. Please try again.');
                  }
                }}
                className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                {isOtpVerified ? 'Verified' : 'Verify OTP'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">If OTP isn't verified, signup will be blocked.</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Create a secure password"
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/authenticate/sign-in" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-4 text-xs text-gray-400">(This component expects server endpoints <code>/api/send-otp</code> and <code>/api/verify-otp</code> to be implemented.)</div>
      </div>
    </div>
  );
}
