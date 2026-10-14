// DFD 1.0-9.0 - Main Application Router & Layout Component
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FeedPage } from './pages/FeedPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MyReportsPage } from './pages/MyReportsPage';
import { LoginPage } from './pages/LoginPage';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MapPage } from './pages/MapPage';
import { IssueDetailPage } from './pages/IssueDetailPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('feed');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const handleNavigate = (page, issueId = null) => {
    if (issueId) {
      setSelectedIssueId(issueId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-6xl w-full mx-auto pb-24 md:pb-12">
        {currentPage === 'feed' && <FeedPage onNavigate={handleNavigate} />}
        {currentPage === 'map' && <MapPage onNavigate={handleNavigate} />}
        {currentPage === 'report' && <ReportIssuePage onNavigate={handleNavigate} />}
        {currentPage === 'my-reports' && <MyReportsPage onNavigate={handleNavigate} />}
        {currentPage === 'officer' && <OfficerDashboard onNavigate={handleNavigate} />}
        {currentPage === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}
        {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
        {currentPage === 'issue-detail' && (
          <IssueDetailPage issueId={selectedIssueId} onNavigate={handleNavigate} />
        )}
      </main>

      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  );
}



export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
