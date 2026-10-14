// DFD 1.0-9.0 - Mobile Sticky Bottom Navigation Bar
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Newspaper, Map, PlusCircle, ClipboardList, User, Briefcase } from 'lucide-react';

export const BottomNav = ({ currentPage, onNavigate }) => {
  const { isAuthenticated, isOfficer, isAdmin } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 md:hidden flex items-center justify-around shadow-lg">
      <button
        onClick={() => onNavigate('feed')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentPage === 'feed' ? 'text-civic-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Newspaper className="w-5 h-5" />
        <span className="text-[10px]">{t('feed')}</span>
      </button>

      <button
        onClick={() => onNavigate('map')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentPage === 'map' ? 'text-civic-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px]">{t('map')}</span>
      </button>

      {/* Primary Floating Action: Report Grievance */}
      <button
        onClick={() => onNavigate('report')}
        className="flex flex-col items-center -mt-5 group"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-civic-700 to-civic-500 flex items-center justify-center text-white shadow-lg shadow-civic-600/30 group-active:scale-95 transition-transform">
          <PlusCircle className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-civic-700 mt-1">{t('report')}</span>
      </button>

      {isAuthenticated ? (
        <>
          <button
            onClick={() => onNavigate('my-reports')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentPage === 'my-reports' ? 'text-civic-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px]">{t('my_reports')}</span>
          </button>
          {(isOfficer || isAdmin) && (
            <button
              onClick={() => onNavigate('officer')}
              className={`flex flex-col items-center gap-1 transition-colors ${
                currentPage === 'officer' ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Briefcase className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] text-amber-700 font-bold">{t('portal')}</span>
            </button>
          )}
        </>
      ) : (
        <button
          onClick={() => onNavigate('login')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPage === 'login' ? 'text-civic-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{t('login')}</span>
        </button>
      )}
    </div>
  );
};
