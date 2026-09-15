"use client";
import { useState } from 'react';
import { SignInAction } from '@/action';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/user-slice';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function SignIn() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [formData, setFormData] = useState({
    userid: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await SignInAction(formData);
      if (response?.success) {
        dispatch(setUser(response.user));
        router.push('/');
      } else {
        setError(response?.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Feed</span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12h3.2l2.3-5.2 4 10.4 2.8-6.4 2.2 3.2h2.5"/>
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Sign in to your Pulse account to curate your feed
            </p>
          </div>
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userid" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Username or Email
              </label>
              <input
                id="userid"
                name="userid"
                type="text"
                required
                value={formData.userid}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm bg-slate-50 hover:bg-white focus:bg-white text-slate-900 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all"
                placeholder="Enter your username or email..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link 
                  href="/authenticate/forgot-passward" 
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm bg-slate-50 hover:bg-white focus:bg-white text-slate-900 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all"
                placeholder="Enter your password"
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`btn-gradient w-full py-3.5 px-6 rounded-2xl text-xs font-bold text-white shadow-md transition-all ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing In...' : 'Sign In to Pulse'}
            </button>
          </form>
          
          <div className="text-center pt-2 border-t border-slate-100 text-xs sm:text-sm">
            <p className="text-slate-500">
              New to Pulse?{' '}
              <Link href="/authenticate/sign-up" className="text-indigo-600 hover:text-indigo-800 font-bold">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}