import React, { useState } from 'react';
import { ChefHat, Lock, User, Mail, CheckCircle2, Loader2, ArrowLeft, UserPlus, Building2, Sparkles, Zap, KeyRound } from 'lucide-react';
import { UserRole } from '../types';
import { signIn, signUp, getUserRole, Plan } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

type LoginMode = 'signin' | 'signup' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<LoginMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('starter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Email + password uniquely identify the account and its tenant, so no
      // tenant name is needed at login — the app resolves the org after sign-in.
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
      await signUp(email, password, fullName, tenantName, selectedPlan);
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
              <img src="/logo-mark.svg" alt="Logo" className="h-[72px] w-auto object-contain" onError={(e) => {
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
                  <img src="/logo-mark.svg" alt="Logo" className="h-[48px] w-auto object-contain" onError={(e) => {
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

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-slate-500 hover:text-cyan-600 font-medium inline-flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Forgot password?
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-cyan-600 hover:text-cyan-500 font-medium inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Create account
                </button>
              </div>
            </div>
          )}

          {/* ── Forgot Password Form ── */}
          {mode === 'forgot' && (
            <div>
              <button
                onClick={() => { setMode('signin'); setError(''); setResetSent(false); }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1 mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>

              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Reset password</h2>
              <p className="mt-2 text-sm text-slate-600 mb-8">
                Enter your email and we'll send you a link to set a new password.
              </p>

              {resetSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <div className="inline-flex p-2 bg-emerald-100 rounded-full mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-900 mb-1">Check Your Email</h3>
                  <p className="text-sm text-emerald-700">
                    We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
                  </p>
                  <button
                    onClick={() => { setMode('signin'); setResetSent(false); }}
                    className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                        placeholder="you@company.com"
                        autoFocus
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
                    disabled={loading || !email}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={14} />}
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
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

              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Start your free trial</h2>
              <p className="mt-2 text-sm text-slate-600 mb-6">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Sparkles size={11} /> 15 days free
                </span>
                <span className="ml-2">No credit card required.</span>
              </p>

              <form className="space-y-4" onSubmit={handleSignUp}>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullname" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Your Name
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                {/* Organization / Tenant Name */}
                <div>
                  <label htmlFor="tenant" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Organization Name
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="tenant"
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="Cal Poly Pomona Dining"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 ml-1">Your tenant name. You'll be the owner.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="signup-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                        placeholder="6+ chars"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                    Choose Your Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('starter')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedPlan === 'starter'
                          ? 'border-cyan-500 bg-cyan-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900">Starter</span>
                        {selectedPlan === 'starter' && <CheckCircle2 size={14} className="text-cyan-600" />}
                      </div>
                      <p className="text-xs text-slate-500">$99/mo</p>
                      <p className="text-[10px] text-slate-400 mt-1">1 location · 3 users · 200/mo</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('professional')}
                      className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                        selectedPlan === 'professional'
                          ? 'border-cyan-500 bg-cyan-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">Popular</span>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900">Professional</span>
                        {selectedPlan === 'professional' && <CheckCircle2 size={14} className="text-cyan-600" />}
                      </div>
                      <p className="text-xs text-slate-500">$299/mo</p>
                      <p className="text-[10px] text-slate-400 mt-1">5 locations · 15 users · 1k/mo</p>
                    </button>
                  </div>

                  {/* Enterprise CTA */}
                  <div className="mt-2 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-violet-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Need Enterprise?</p>
                        <p className="text-[10px] text-slate-500">Unlimited locations + SSO + EDI</p>
                      </div>
                    </div>
                    <a href="mailto:sales@chefcode.ai?subject=Enterprise%20Demo%20Request" className="text-[11px] font-bold text-violet-700 hover:text-violet-900 underline">
                      Book a Demo →
                    </a>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !fullName.trim() || !tenantName.trim()}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={14} />}
                  {loading ? 'Creating account...' : 'Start 15-Day Free Trial'}
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
