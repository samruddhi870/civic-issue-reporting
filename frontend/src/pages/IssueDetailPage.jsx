// DFD 2.0, 4.0, 5.0, 8.0 - Issue Detail, Discussion & Resolution Inspection Page
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi } from '../services/api';
import { SlaCountdownBadge } from '../components/SlaCountdownBadge';
import { ResolutionReviewModal } from '../components/ResolutionReviewModal';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ThumbsUp, 
  MessageSquare, 
  Send, 
  Camera, 
  RotateCcw,
  Sparkles,
  Flame,
  Star,
  Copy,
  Check
} from 'lucide-react';

const STATUS_STEPS = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'];

export const IssueDetailPage = ({ issueId, onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Upvote state
  const [upvoting, setUpvoting] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Resolution modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Mini-map ref
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchIssueDetails = async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getIssueById(issueId);
      setIssue(res.issue);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load grievance details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) {
      fetchIssueDetails();
    }
  }, [issueId]);

  // Initialize mini Leaflet map once issue details load
  useEffect(() => {
    if (!issue || !issue.latitude || !issue.longitude || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [issue.latitude, issue.longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Pin Marker
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      L.marker([issue.latitude, issue.longitude], { icon: customIcon }).addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [issue]);

  // Copy Ticket Number to clipboard
  const handleCopyTicket = () => {
    if (!issue) return;
    navigator.clipboard.writeText(issue.ticket_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Upvote / Me Too Toggle
  const handleToggleUpvote = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to upvote civic grievances.');
      onNavigate('login');
      return;
    }
    setUpvoting(true);
    try {
      const res = await issuesApi.toggleUpvote(issue.id);
      setIssue((prev) => ({
        ...prev,
        has_upvoted: res.upvoted,
        upvote_count: res.upvote_count,
        priority_score: res.priority_score,
      }));
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
    } finally {
      setUpvoting(false);
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!isAuthenticated) {
      alert('Please sign in to participate in the grievance discussion.');
      onNavigate('login');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await issuesApi.addComment(issue.id, commentText.trim());
      setIssue((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), res.comment],
      }));
      setCommentText('');
    } catch (err) {
      alert(err.message || 'Failed to submit comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-civic-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading grievance details...</p>
      </div>
    );
  }

  if (errorMsg || !issue) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Grievance Not Found</h3>
        <p className="text-xs text-slate-500">{errorMsg || 'The requested ticket does not exist or was removed.'}</p>
        <button
          onClick={() => onNavigate('feed')}
          className="px-4 py-2 rounded-xl bg-civic-600 text-white font-bold text-xs shadow-md hover:bg-civic-700"
        >
          Return to Public Feed
        </button>
      </div>
    );
  }

  const effectiveStatus = issue.status === 'Reopened' ? 'In Progress' : issue.status;
  const currentStepIdx = STATUS_STEPS.indexOf(effectiveStatus);
  const beforePhotos = issue.photos?.filter((p) => p.photo_type === 'before') || issue.photos || [];
  const afterPhoto = issue.resolution_proof_url || issue.photos?.find((p) => p.photo_type === 'after')?.image_url;
  const isReporter = user && issue.citizen_id === user.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate('feed')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        {/* Upvote Button */}
        <button
          onClick={handleToggleUpvote}
          disabled={upvoting}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 ${
            issue.has_upvoted
              ? 'bg-civic-600 text-white border-civic-600'
              : 'bg-white text-civic-700 border-civic-200 hover:bg-civic-50'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>{issue.has_upvoted ? 'Upvoted' : 'Me Too'} ({issue.upvote_count || 0})</span>
        </button>
      </div>

      {/* Main Ticket Card Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyTicket}
                className="font-mono text-xs font-bold text-civic-700 bg-civic-50 hover:bg-civic-100 px-2.5 py-1 rounded-lg border border-civic-200 inline-flex items-center gap-1.5 transition-colors"
                title="Click to copy ticket ID"
              >
                <span>{issue.ticket_number}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-civic-500" />}
              </button>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                {issue.category}
              </span>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  issue.severity === 'emergency'
                    ? 'bg-rose-100 text-rose-800'
                    : issue.severity === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {issue.severity}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                <Flame className="w-3 h-3" />
                Score: {issue.priority_score}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 mt-2">
              {issue.title}
            </h2>
          </div>

          {/* Live SLA Countdown Badge */}
          <SlaCountdownBadge
            slaDeadline={issue.sla_deadline}
            status={issue.status}
            resolvedAt={issue.resolved_at}
            isCriticalOverdue={issue.is_critical_overdue}
          />
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {issue.description}
        </p>

        {/* Status Stepper Progression */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-5 text-center text-[10px] sm:text-xs font-semibold text-slate-400 gap-1">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <span
                  key={step}
                  className={`${
                    isCurrent
                      ? 'text-civic-700 font-extrabold'
                      : isCompleted
                      ? 'text-emerald-700 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              );
            })}
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
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

        {/* Assignment & Department Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-civic-600" />
              <span>{issue.department_name || 'Assigned Department'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Officer in Charge</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <User className="w-4 h-4 text-civic-600" />
              <span>{issue.assigned_officer_name || 'Dispatch pending'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reported By</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-civic-600" />
              <span>{issue.citizen_name || 'Citizen'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Proof 72h Review Action (When Resolved) */}
      {issue.status === 'Resolved' && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-3xl p-6 border border-emerald-300 shadow-md space-y-4 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-emerald-950">
                  Officer Marked Grievance as Resolved
                </h3>
                <p className="text-xs text-emerald-800">
                  Proof of completion has been submitted. The 72-hour citizen verification window is active.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review Proof & Confirm / Reopen</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Rating Card (When Closed) */}
      {issue.status === 'Closed' && issue.feedback && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Citizen Verification</span>
            <p className="text-xs font-bold text-slate-800">
              Resolved and finalized with citizen satisfaction confirmation.
            </p>
            {issue.feedback.comments && (
              <p className="text-xs text-slate-500 italic mt-1">&quot;{issue.feedback.comments}&quot;</p>
            )}
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= (issue.feedback.rating || 5)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-amber-900 ml-1">
              {issue.feedback.rating}/5
            </span>
          </div>
        </div>
      )}

      {/* Evidence & Resolution Photo Gallery */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-civic-600" />
          <span>Visual Photographic Evidence</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Photo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Before Rectification (Citizen Evidence)
            </span>
            {beforePhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {beforePhotos.map((p, idx) => (
                  <img
                    key={idx}
                    src={p.image_url}
                    alt="Before condition"
                    className="w-full h-44 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-44 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                No before photo submitted
              </div>
            )}
          </div>

          {/* After Photo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              After Rectification (Official Resolution Proof)
            </span>
            {afterPhoto ? (
              <div className="relative">
                <img
                  src={afterPhoto}
                  alt="After condition"
                  className="w-full h-44 rounded-2xl object-cover border border-emerald-300 shadow-xs"
                />
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-emerald-700/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Proof</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-44 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 text-center px-4">
                Resolution photo will be uploaded by the assigned municipal officer upon task completion.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Mini-Map & Street Address */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-civic-600" />
          <span>Geographical Spot & Address</span>
        </h3>

        <div className="space-y-3">
          <div className="w-full h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span><strong>Address:</strong> {issue.address || 'Location registered'}</span>
            <span className="font-mono text-[11px] text-slate-400">
              {issue.latitude?.toFixed(4)}, {issue.longitude?.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline (Status Progression) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-civic-600" />
          <span>Official Audit Timeline & Status Logs</span>
        </h3>

        <div className="space-y-4 relative pl-4 border-l-2 border-slate-200">
          {issue.status_logs && issue.status_logs.length > 0 ? (
            issue.status_logs.map((log) => (
              <div key={log.id} className="relative space-y-1">
                <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-civic-600 ring-4 ring-white" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Status changed to <strong className="text-civic-700">{log.to_status}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {log.remarks && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {log.remarks}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No previous transition logs recorded.</p>
          )}
        </div>
      </div>

      {/* Community Discussion & Official Updates Feed */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
        <h3 className="font-heading font-bold text-base text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-civic-600" />
            <span>Community Discussion & Official Updates</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {issue.comments?.length || 0} Comments
          </span>
        </h3>

        {/* Comment Thread */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {issue.comments && issue.comments.length > 0 ? (
            issue.comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                  comment.is_official
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{comment.user_name}</span>
                    {comment.is_official ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Official Authority Update
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Citizen</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">{comment.content}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-6">
              No comments yet. Have more details or updates? Post below.
            </p>
          )}
        </div>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isAuthenticated ? "Write a civic update or inquiry..." : "Sign in to post a comment..."}
              disabled={submittingComment}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500 bg-slate-50"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Sending...' : 'Post'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ResolutionReviewModal
          issue={issue}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => fetchIssueDetails()}
        />
      )}
    </div>
  );
};
