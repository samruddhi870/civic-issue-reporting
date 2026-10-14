// DFD 2.0 & 4.0 - Public Civic Grievance Feed & Upvotes
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi } from '../services/api';
import { SlaCountdownBadge } from '../components/SlaCountdownBadge';
import { ThumbsUp, MapPin, Clock, Filter, Search, ShieldCheck, Flame, RefreshCw } from 'lucide-react';

const CATEGORY_FILTERS = [
  'All',
  'Water leakage',
  'Open manhole',
  'Garbage / Waste',
  'Streetlight / Electricity',
  'Pothole / Road damage',
  'Other',
];

export const FeedPage = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // priority, sla, created
  const [upvotingIds, setUpvotingIds] = useState(new Set());

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy };
      if (category !== 'All') params.category = category;
      if (search.trim()) params.search = search.trim();

      const res = await issuesApi.getIssues(params);
      setIssues(res.issues || []);
    } catch (err) {
      console.error('Failed to fetch public issues feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [category, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleToggleUpvote = async (issueId) => {
    if (!isAuthenticated) {
      alert('Please sign in to upvote civic grievances.');
      onNavigate('login');
      return;
    }

    setUpvotingIds((prev) => new Set(prev).add(issueId));
    try {
      const res = await issuesApi.toggleUpvote(issueId);
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? { ...iss, upvote_count: res.upvote_count, priority_score: res.priority_score }
            : iss
        )
      );
    } catch (err) {
      console.error('Upvote failed:', err);
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-civic-800 via-civic-700 to-civic-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-civic-200 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Transparent Municipal Governance</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
          Report Civic Issues. Enforce SLA Deadlines.
        </h2>
        <p className="text-xs sm:text-sm text-civic-100 max-w-xl leading-relaxed">
          Potholes, water leaks, garbage, and broken streetlights reported by citizens are automatically routed with binding resolution countdowns and escalation ladders.
        </p>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('report')}
            className="px-5 py-2.5 rounded-xl bg-white text-civic-800 font-bold text-xs shadow-md hover:bg-civic-50 transition-all active:scale-95"
          >
            + Report New Grievance
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, title, area..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="priority">🔥 Highest Priority Score</option>
              <option value="sla">⏳ SLA Most Urgent</option>
              <option value="created">🕒 Recently Reported</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-civic-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Issue Feed Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-civic-600" />
          Loading issues...
        </div>
      ) : issues.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-700">No grievances match your criteria.</p>
          <p className="text-xs text-slate-400">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/90 hover:shadow-md transition-shadow space-y-3.5"
            >
              {/* Card Header: Ticket, Category & SLA Countdown Badge */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                    {issue.ticket_number}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {issue.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    issue.severity === 'emergency' ? 'bg-rose-100 text-rose-800' :
                    issue.severity === 'high' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {issue.severity}
                  </span>
                </div>

                {/* DFD 4.0 - Live SLA Countdown Badge */}
                <SlaCountdownBadge
                  slaDeadline={issue.sla_deadline}
                  status={issue.status}
                  resolvedAt={issue.resolved_at}
                  isCriticalOverdue={issue.is_critical_overdue}
                />
              </div>

              {/* Title & Description */}
              <div 
                onClick={() => onNavigate('issue-detail', issue.id)}
                className="cursor-pointer group"
              >
                <h3 className="text-base font-bold text-slate-900 group-hover:text-civic-700 transition-colors flex items-center justify-between">
                  <span>{issue.title}</span>
                  <span className="text-[11px] font-semibold text-civic-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                    Details &rarr;
                  </span>
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Evidence Photos */}
              {issue.photos && issue.photos.length > 0 && (
                <div 
                  onClick={() => onNavigate('issue-detail', issue.id)}
                  className="flex items-center gap-2 overflow-x-auto pb-1 cursor-pointer"
                >
                  {issue.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p.image_url}
                      alt="Grievance evidence"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Card Footer: Location, Priority Score & Upvote Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 line-clamp-1 max-w-sm">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{issue.address || 'Location registered'}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Priority score indicator */}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600" title="Calculated Priority Score">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Score: {issue.priority_score}
                  </span>

                  {/* Upvote Button ("Me Too") */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleUpvote(issue.id);
                    }}
                    disabled={upvotingIds.has(issue.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm ${
                      issue.has_upvoted
                        ? 'bg-civic-600 text-white border-civic-600 shadow-civic-600/20'
                        : 'border-civic-200 bg-civic-50 text-civic-700 hover:bg-civic-100'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{issue.has_upvoted ? 'Upvoted' : 'Me Too'} ({issue.upvote_count})</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
