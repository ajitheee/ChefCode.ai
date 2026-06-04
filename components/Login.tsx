import React, { useState } from 'react';
import { ChefHat, Lock, User, Mail, CheckCircle2, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { UserRole } from '../types';
import { signIn, signUp, getUserRole } from '../services/authService';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

type LoginMode = 'signin' | 'signup';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<LoginMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await signIn(email, password);
      const role = getUserRole(user);
      onLogin(role);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, fullName, 'admin');
      setSignupSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding (kept from original) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a202c] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop"
            alt="Kitchen background"
            className="w-full h-full object-cover mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10">
          <div className="flex items-center text-white mb-8">
            <div className="bg-white p-3 rounded-2xl border-2 border-white/20 mr-6 flex flex-shrink-0 items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] relative">
              <img src="/logo.png" alt="Logo" className="h-[72px] w-auto object-contain" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                document.getElementById('fallback-icon-main')!.style.display = 'block';
              }} />
              <ChefHat id="fallback-icon-main" size={56} className="text-slate-800" style={{ display: 'none' }} />
            </div>
            <h1 className="text-6xl font-bold tracking-tight shadow-sm drop-shadow-md">ChefCode<span className="text-cyan-400">.ai</span></h1>
          </div>
          <h2 className="text-4xl font-semibold text-white leading-tight mt-12 max-w-lg">
            The intelligent culinary ledger for modern kitchens.
          </h2>
          <p className="text-slate-400 mt-6 text-lg max-w-md leading-relaxed">
            Automate your invoice processing, track food costs in real-time, and eliminate manual data entry with AI-powered GL coding.
          </p>
        </div>
        <div className="relative z-10 text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} ChefCode.ai. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-slate-50">
        <div className="mx-auto w-full max-w-sm lg:w-96">

          {/* ── Sign In Form ── */}
          {mode === 'signin' && !signupSuccess && (
            <div>
              <div className="lg:hidden flex items-center justify-center mb-8">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 mr-4 flex flex-shrink-0 items-center justify-center shadow-md relative">
                  <img src="/logo.png" alt="Logo" className="h-[48px] w-auto object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    document.getElementById('fallback-icon-mobile')!.style.display = 'block';
                  }} />
                  <ChefHat id="fallback-icon-mobile" size={40} className="text-slate-800" style={{ display: 'none' }} />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">ChefCode<span className="text-cyan-600">.ai</span></h1>
              </div>

              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-600 mb-8">
                Sign in to your account to continue.
              </p>

              <form className="space-y-5" onSubmit={handleSignIn}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-sm text-cyan-600 hover:text-cyan-500 font-medium inline-flex items-center gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  Create a new account
                </button>
              </div>
            </div>
          )}

          {/* ── Sign Up Form ── */}
          {mode === 'signup' && !signupSuccess && (
            <div>
              <button
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>

              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create account</h2>
              <p className="mt-2 text-sm text-slate-600 mb-8">
                Set up your ChefCode.ai account to get started.
              </p>

              <form className="space-y-5" onSubmit={handleSignUp}>
                <div>
                  <label htmlFor="fullname" className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}

          {/* ── Sign Up Success ── */}
          {signupSuccess && (
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Check Your Email</h2>
              <p className="text-slate-500 mt-2 max-w-xs">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={() => { setSignupSuccess(false); setMode('signin'); }}
                className="mt-6 text-sm text-cyan-600 hover:text-cyan-500 font-medium"
              >
                Back to sign in
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
