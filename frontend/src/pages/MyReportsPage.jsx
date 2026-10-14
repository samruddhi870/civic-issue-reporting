// DFD 2.0 - Citizen My Reports Dashboard Page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi } from '../services/api';
import { SlaCountdownBadge } from '../components/SlaCountdownBadge';
import { ResolutionReviewModal } from '../components/ResolutionReviewModal';
import { ClipboardList, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, Sparkles, Star } from 'lucide-react';

const STATUS_STEPS = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'];

export const MyReportsPage = ({ onNavigate }) => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, resolved
  const [selectedIssueForReview, setSelectedIssueForReview] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getMyReports();
      setIssues(res.issues || []);
    } catch (err) {
      console.error('Failed to load my reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-civic-100 text-civic-700 flex items-center justify-center mx-auto">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-bold text-slate-900">Sign in to track your grievances</h2>
        <p className="text-xs text-slate-500">
          View your submitted reports, real-time SLA countdowns, officer progress notes, and resolution proofs.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-2.5 rounded-xl bg-civic-600 text-white font-bold text-sm shadow-md hover:bg-civic-700 transition-all"
        >
          {t('login')}
        </button>
      </div>
    );
  }

  const filteredIssues = issues.filter((iss) => {
    if (filter === 'active') return !['Resolved', 'Closed'].includes(iss.status);
    if (filter === 'resolved') return ['Resolved', 'Closed'].includes(iss.status);
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
            <span>{t('my_reports')}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-civic-100 text-civic-800">
              {issues.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Track status progression and live SLA deadlines for all civic issues submitted by {user?.full_name}.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-civic-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({issues.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'active' ? 'bg-civic-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({issues.filter((i) => !['Resolved', 'Closed'].includes(i.status)).length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'resolved' ? 'bg-civic-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Resolved ({issues.filter((i) => ['Resolved', 'Closed'].includes(i.status)).length})
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading reports...</div>
      ) : filteredIssues.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{t('no_reports_yet')}</p>
          <p className="text-xs text-slate-400">Notice a pothole, leak, or garbage pile? Report it now.</p>
          <button
            onClick={() => onNavigate('report')}
            className="px-4 py-2 rounded-xl bg-civic-600 text-white text-xs font-bold shadow-md hover:bg-civic-700"
          >
            + {t('report')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const effectiveStatus = issue.status === 'Reopened' ? 'In Progress' : issue.status;
            const currentStepIdx = STATUS_STEPS.indexOf(effectiveStatus);

            return (
              <div
                key={issue.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                        {issue.ticket_number}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {issue.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{issue.title}</h3>
                  </div>

                  {/* Live SLA Countdown Badge */}
                  <SlaCountdownBadge
                    slaDeadline={issue.sla_deadline}
                    status={issue.status}
                    resolvedAt={issue.resolved_at}
                    isCriticalOverdue={issue.is_critical_overdue}
                  />
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {issue.description}
                </p>

                {/* Evidence Photo Preview */}
                {issue.photos && issue.photos.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {issue.photos.map((p, idx) => (
                      <img
                        key={idx}
                        src={p.image_url}
                        alt="Issue photo"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ))}
                  </div>
                )}

                {/* Status Progress Stepper */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-5 text-center text-[10px] font-semibold text-slate-400 gap-1 mb-1.5">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <span
                          key={step}
                          className={`${
                            isCurrent
                              ? 'text-civic-700 font-bold'
                              : isCompleted
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      );
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      return (
                        <div
                          key={step}
                          className={`flex-1 border-r last:border-r-0 border-white transition-all ${
                            isCompleted ? 'bg-civic-600' : 'bg-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Resolution Review Banner for Resolved Issues */}
                {issue.status === 'Resolved' && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <h4 className="text-xs font-bold text-emerald-950">
                          Resolution Proof Submitted (72h Review Window Active)
                        </h4>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        The assigned officer has uploaded completion proof. Please inspect the after-photo and confirm resolution or reopen within 72 hours.
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedIssueForReview(issue)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Review & Confirm / Reopen
                    </button>
                  </div>
                )}

                {/* Closed Feedback Summary */}
                {issue.status === 'Closed' && issue.feedback && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                    <span className="font-semibold text-[11px] text-slate-500">Citizen Verification:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= (issue.feedback.rating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] font-bold text-slate-800 ml-1">
                        {issue.feedback.rating}/5
                      </span>
                    </div>
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{issue.address || 'Location registered'}</span>
                  </div>

                  <div className="flex items-center gap-3 font-medium">
                    <span>Officer: <strong className="text-slate-700">{issue.assigned_officer_name}</strong></span>
                    <span>Dept: <strong className="text-slate-700">{issue.department_name}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Review Modal */}
      {selectedIssueForReview && (
        <ResolutionReviewModal
          issue={selectedIssueForReview}
          onClose={() => setSelectedIssueForReview(null)}
          onSuccess={() => fetchReports()}
        />
      )}
    </div>
  );
};

