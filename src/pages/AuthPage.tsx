import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConnection } from '../context/ConnectionContext';
import { ShieldCheck, Lock, Mail, User as UserIcon, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { isConnected } = useConnection();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter a valid email');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        await register({ name, email, password });
        showToast('Account created successfully! Welcome to LifeVault.', 'success');
      } else {
        if (!email.trim() || !password) throw new Error('Please provide both email and password');
        await login({ email, password });
        showToast('Signed in successfully.', 'success');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.details || err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setIsRegistering(false);
    setEmail('demo@lifevault.test');
    setPassword('Demo@1234');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#E9E3F8] items-center justify-center text-purple-900 mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-purple-800" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isRegistering ? 'Create your LifeVault' : 'Welcome back to LifeVault'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Keep important documents close, and every expiry date in sight.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegistering
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isRegistering
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Demo Credentials Quick Button */}
        {!isRegistering && (
          <div className="bg-[#E9E3F8]/60 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-purple-950 block">Instant Exploration</span>
              <span className="text-purple-800 text-[11px]">Demo account with 10 seeded records</span>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-xs text-xs transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Fill Demo</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8E5E7] border border-rose-300 text-rose-900 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label htmlFor="name-input" className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email-input" className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password-input" className="block text-xs font-bold text-slate-700 mb-1">
              Password {isRegistering && <span className="text-slate-400 font-normal">(min 6 characters)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Authenticating...' : isRegistering ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Server connection status footnote */}
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Backend API: <span className={isConnected ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>{isConnected ? 'Connected & Ready' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
