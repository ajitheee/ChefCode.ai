import React, { useState } from 'react';
import { ChefHat, Lock, User, ShieldCheck, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

type LoginStep = 'credentials' | 'mfa' | 'success';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingRole, setPendingRole] = useState<UserRole>(null);
  const [mfaStatus, setMfaStatus] = useState<'waiting' | 'approved'>('waiting');

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Mock authentication
    if (username === 'admin' && password === 'admin123') {
      setPendingRole('admin');
      setStep('mfa');
    } else if (username === 'chef' && password === 'chef123') {
      setPendingRole('chef');
      setStep('mfa');
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  const handleMfaApprove = () => {
    setMfaStatus('approved');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        if (pendingRole) onLogin(pendingRole);
      }, 1000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding */}
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

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-slate-50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          
          {step === 'credentials' && (
            <div className="animate-fade-in">
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
                Please enter your credentials to access your account.
                <br/>
                <span className="text-xs text-slate-400 mt-1 inline-block">(Hint: admin/admin123 or chef/chef123)</span>
              </p>

              <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 transition-colors"
                      placeholder="Enter your username"
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
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
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
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                >
                  Sign in
                </button>
              </form>
            </div>
          )}

          {step === 'mfa' && (
            <div className="animate-fade-in flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-600 mb-8">
                To secure your account, we've sent a Duo push notification to your registered device.
              </p>

              <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center text-left">
                    <div className="bg-slate-100 p-2 rounded-lg mr-3">
                      <Smartphone className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">iOS Device</p>
                      <p className="text-xs text-slate-500">**** **** 1234</p>
                    </div>
                  </div>
                  {mfaStatus === 'waiting' ? (
                    <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>

                {mfaStatus === 'waiting' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 animate-pulse">Waiting for approval...</p>
                    <button
                      onClick={handleMfaApprove}
                      className="w-full py-2.5 px-4 border-2 border-emerald-600 text-emerald-700 bg-emerald-50 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors mt-4"
                    >
                      (Prototype: Simulate Duo Approval)
                    </button>
                  </div>
                ) : (
                  <div className="text-emerald-600 font-medium flex items-center justify-center py-2">
                    Approved! Logging you in...
                  </div>
                )}
              </div>

              <button 
                onClick={() => setStep('credentials')}
                className="text-sm text-cyan-600 hover:text-cyan-500 font-medium"
              >
                Cancel and return to login
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="animate-fade-in flex flex-col items-center text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Authentication Successful</h2>
              <p className="text-slate-500 mt-2">Redirecting to your dashboard...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
