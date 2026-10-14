// DFD 8.0 - Citizen Resolution Review, Star Rating Feedback & Reopen Modal
import React, { useState, useEffect } from 'react';
import { issuesApi } from '../services/api';
import { 
  CheckCircle2, 
  RotateCcw, 
  Star, 
  Clock, 
  Camera, 
  X, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const ResolutionReviewModal = ({ issue, onClose, onSuccess }) => {
  if (!issue) return null;

  const [mode, setMode] = useState('confirm'); // 'confirm' or 'reopen'
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isSatisfied, setIsSatisfied] = useState(true);
  const [reopenReason, setReopenReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate 72-hour review countdown
  const [hoursRemaining, setHoursRemaining] = useState(72);
  useEffect(() => {
    if (issue.resolved_at) {
      const resolvedDate = new Date(issue.resolved_at);
      const expiryDate = new Date(resolvedDate.getTime() + 72 * 60 * 60 * 1000);
      const diffMs = expiryDate - new Date();
      const diffHrs = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      setHoursRemaining(diffHrs);
    }
  }, [issue.resolved_at]);

  const beforePhoto = issue.photos?.find((p) => p.photo_type === 'before')?.image_url || issue.photos?.[0]?.image_url;
  const afterPhoto = issue.resolution_proof_url || issue.photos?.find((p) => p.photo_type === 'after')?.image_url;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await issuesApi.confirmResolution(issue.id, {
        rating,
        comments: feedbackComments.trim(),
        is_satisfied: isSatisfied
      });
      if (onSuccess) onSuccess('closed');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to confirm resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      setErrorMsg('Please state a specific reason (minimum 5 characters) for reopening.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await issuesApi.reopenIssue(issue.id, {
        reason: reopenReason.trim()
      });
      if (onSuccess) onSuccess('reopened');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reopen issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const starLabels = ['', 'Poor fix', 'Fair', 'Good work', 'Very Good', 'Exceptional resolution!'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                {issue.ticket_number}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Resolved by Officer
              </span>
            </div>
            <h3 className="text-lg font-heading font-extrabold text-slate-900 mt-1">
              {issue.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 72h Citizen Review Window Alert */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
            <span>72-Hour Citizen Review Window Active</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px]">
            {hoursRemaining}h left to review
          </span>
        </div>

        {/* Before vs After Visual Proof Comparison */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-civic-600" />
            Verification: Before & After Evidence
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Before Photo */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">Initial Citizen Evidence</span>
              <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                {beforePhoto ? (
                  <img src={beforePhoto} alt="Before Fix" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No before photo</div>
                )}
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">BEFORE</span>
              </div>
            </div>

            {/* After Photo (Mandatory Officer Proof) */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 block">Officer Resolution Proof</span>
              <div className="aspect-video bg-emerald-50 rounded-xl overflow-hidden border-2 border-emerald-400 relative shadow-sm">
                {afterPhoto ? (
                  <img src={afterPhoto} alt="After Fix Proof" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Awaiting proof photo</div>
                )}
                <span className="absolute bottom-1 left-1 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED FIX
                </span>
              </div>
            </div>
          </div>

          {/* Officer remarks note */}
          {issue.resolution_remarks && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-0.5">
              <span className="font-bold text-slate-800">Officer Work Note:</span>
              <p className="italic">"{issue.resolution_remarks}"</p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Tabs: Confirm vs Reopen */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('confirm'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'confirm'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Accept & Rate Fix</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('reopen'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'reopen'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Fix Inadequate? Reopen</span>
          </button>
        </div>

        {/* Tab 1: Confirm Resolution & 5-Star Feedback Form */}
        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4 animate-fade-in">
            {/* Interactive Star Rating */}
            <div className="space-y-2 text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block">Rate the Quality of Municipal Resolution</span>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-700 block h-4">
                {starLabels[hoverRating || rating]}
              </span>
            </div>

            {/* Satisfaction Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Are you satisfied with the response time & fix?</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSatisfied(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    isSatisfied
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsSatisfied(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    !isSatisfied
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> No
                </button>
              </div>
            </div>

            {/* Optional Citizen Feedback Comments */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Citizen Comments / Praise for Officer</label>
              <textarea
                rows={2}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="e.g. Prompt fix, clean work site. Thank you Roads Division team!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
              />
            </div>

            {/* Submit Confirm Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Confirming...' : 'Confirm Resolution & Close Grievance'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Reopen Grievance Form */}
        {mode === 'reopen' && (
          <form onSubmit={handleReopen} className="space-y-4 animate-fade-in">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Executive Departmental Review Notice
              </span>
              <p className="text-[11px] leading-relaxed">
                Reopening this ticket will increase its municipal priority score and notify both the Assigned Officer and the Department Head for urgent rework.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Why is the resolution proof unsatisfactory? (Required)
              </label>
              <textarea
                required
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. The leak was patched with temporary tape, water is already seeping through the asphalt again."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Reopen Grievance for Urgent Rework'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
