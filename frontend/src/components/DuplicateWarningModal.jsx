// DFD 2.0 - 50m Spatial Duplicate Alert Modal
import React from 'react';
import { AlertCircle, ThumbsUp, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { issuesApi } from '../services/api';

export const DuplicateWarningModal = ({ duplicate, onClose, onUpvoted, onProceedAnyway }) => {
  if (!duplicate) return null;

  const { isAuthenticated } = useAuth();
  const issue = duplicate.issue;
  const distance = duplicate.distance_meters;

  const handleUpvoteExisting = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to upvote existing grievances and track resolution updates.');
      return;
    }
    try {
      await issuesApi.toggleUpvote(issue.id);
      if (onUpvoted) onUpvoted(issue);
    } catch (err) {
      console.error('Failed to upvote duplicate issue:', err);
      alert('Could not record upvote. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 text-amber-600">
            <div className="p-2 bg-amber-100 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Similar Grievance Found!</h3>
              <p className="text-xs text-amber-700 font-medium">{distance} meters away from your pin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          An unresolved issue in category <strong className="text-slate-900">{issue.category}</strong> already exists at this location. Upvoting it raises its urgency score and prevents municipal ticket duplication!
        </p>

        {/* Existing Issue Card Preview */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-civic-700">{issue.ticket_number}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold text-[11px]">
              {issue.status}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{issue.title}</h4>
          <p className="text-xs text-slate-500 line-clamp-2">{issue.description}</p>
          <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-200">
            <span>{issue.address || 'Reported nearby'}</span>
            <span className="font-semibold text-amber-600">{issue.upvote_count} citizens affected</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleUpvoteExisting}
            className="w-full py-2.5 px-4 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ThumbsUp className="w-4 h-4" />
            Upvote Existing Ticket ("Me Too")
          </button>
          <button
            onClick={onProceedAnyway}
            className="w-full py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Submit as New Separate Ticket
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
