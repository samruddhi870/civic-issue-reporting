// DFD 1.0 - Authentication Screen (Login, Registration, 1-Click Demo Logins)
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Key, UserCheck, ShieldAlert } from 'lucide-react';

export const LoginPage = ({ onNavigate }) => {
  const { login, register } = useAuth();
  const { t } = useLanguage();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: 'citizen',
        });
      } else {
        await login(email.trim().toLowerCase(), password);
      }
      onNavigate('feed');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Login Helper
  const handleQuickDemoLogin = async (demoEmail, demoPassword) => {
    setErrorMsg('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      onNavigate('feed');
    } catch (err) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-civic-700 to-civic-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-civic-500/30">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-900">
          {isRegister ? 'Create Citizen Account' : 'Sign in to CivicConnect'}
        </h2>
        <p className="text-xs text-slate-500">
          {isRegister
            ? 'Track your grievances, receive instant notifications, and rate resolution proofs'
            : 'Access your citizen dashboard, report issues, and follow SLA timers'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        {/* Toggle Login / Register */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            New Citizen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Pooja Kulkarni"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-bold text-xs shadow-md shadow-civic-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Citizen Account' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* 1-Click Quick Demo Credentials Panel */}
      <div className="bg-slate-100/90 rounded-2xl p-4 border border-slate-200 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Key className="w-4 h-4 text-amber-600" />
          <span>Quick 1-Click Demo Accounts</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Click below to test without typing passwords:
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('citizen@example.com', 'CitizenPassword123!')}
            className="p-2 text-left rounded-xl bg-white border border-slate-200 hover:border-civic-400 hover:bg-civic-50/50 transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-civic-600" />
              <span className="text-xs font-bold text-slate-800">Citizen</span>
            </div>
            <p className="text-[10px] text-slate-400">Pooja Kulkarni</p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('officer.water@civicconnect.org', 'OfficerPassword123!')}
            className="p-2 text-left rounded-xl bg-white border border-slate-200 hover:border-civic-400 hover:bg-civic-50/50 transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Water Officer</span>
            </div>
            <p className="text-[10px] text-slate-400">Rajesh Sharma</p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('officer.roads@civicconnect.org', 'OfficerPassword123!')}
            className="p-2 text-left rounded-xl bg-white border border-slate-200 hover:border-civic-400 hover:bg-civic-50/50 transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-slate-800">Roads Officer</span>
            </div>
            <p className="text-[10px] text-slate-400">Anita Deshmukh</p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('admin@civicconnect.org', 'AdminPassword123!')}
            className="p-2 text-left rounded-xl bg-white border border-slate-200 hover:border-civic-400 hover:bg-civic-50/50 transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-bold text-slate-800">Admin</span>
            </div>
            <p className="text-[10px] text-slate-400">Commissioner</p>
          </button>
        </div>
      </div>
    </div>
  );
};
