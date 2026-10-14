// DFD 1.0-9.0 - Universal Navbar & Language/PWA Controls
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { notificationsApi } from '../services/api';
import { NotificationDrawer } from './NotificationDrawer';
import { ShieldCheck, Download, Globe, User, LogOut, LogIn, Bell } from 'lucide-react';

export const Navbar = ({ onNavigate, currentPage }) => {
  const { user, isAuthenticated, logout, isOfficer, isAdmin } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Poll for unread notifications
  const fetchUnread = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getNotifications({ unread_only: 'true', limit: 1 });
      setUnreadCount(res.total_unread || 0);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchUnread();
    if (isAuthenticated) {
      const interval = setInterval(fetchUnread, 25000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Listen for PWA installation event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-civic-700 to-civic-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-lg text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <span>Civic<span className="text-civic-600">Connect</span></span>
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-civic-100 text-civic-800 uppercase">
                SLA v1
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onNavigate('feed')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'feed'
                ? 'bg-civic-50 text-civic-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {t('feed')}
          </button>
          <button
            onClick={() => onNavigate('map')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'map'
                ? 'bg-civic-50 text-civic-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {t('map')}
          </button>
          <button
            onClick={() => onNavigate('report')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              currentPage === 'report'
                ? 'bg-civic-50 text-civic-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {t('report')}
          </button>
          {isAuthenticated && (
            <button
              onClick={() => onNavigate('my-reports')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentPage === 'my-reports'
                  ? 'bg-civic-50 text-civic-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {t('my_reports')}
            </button>
          )}
          {(isOfficer || isAdmin) && (
            <button
              onClick={() => onNavigate('officer')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                currentPage === 'officer'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>{t('portal')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                currentPage === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <span>Analytics</span>
            </button>
          )}
        </nav>


        {/* Right Tools: Language Picker, PWA Install, User Profile */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button (shows if prompt available or demo) */}
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors shadow-sm"
              title="Install CivicConnect PWA app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('install_app')}</span>
            </button>
          )}

          {/* Multilingual Selector */}
          <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>

          {/* Notification Bell (for authenticated users) */}
          {isAuthenticated && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title={t('notifications')}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Status / Login */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 line-clamp-1">{user.full_name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title={t('logout')}
                className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white text-xs font-bold shadow-md shadow-civic-600/20 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('login')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-over Notification Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          fetchUnread();
        }}
        onNavigate={onNavigate}
      />
    </header>
  );
};
