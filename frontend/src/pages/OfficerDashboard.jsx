// DFD 5.0 - Authority Officer Dashboard & Status Workflow Management
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi, slaApi } from '../services/api';
import { SlaCountdownBadge } from '../components/SlaCountdownBadge';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  MapPin, 
  ArrowRight, 
  Camera, 
  RefreshCw, 
  FileText, 
  User, 
  Building2,
  X,
  Zap
} from 'lucide-react';

export const OfficerDashboard = ({ onNavigate }) => {
  const { user, isOfficer, isAdmin } = useAuth();
  const { t } = useLanguage();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, Submitted, In Progress, overdue
  const [departmentView, setDepartmentView] = useState(false);
  const [selectedIssueForModal, setSelectedIssueForModal] = useState(null);

  // Status Modal state
  const [newStatus, setNewStatus] = useState('In Progress');
  const [remarks, setRemarks] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [runningSla, setRunningSla] = useState(false);

  const handleRunSlaSweep = async () => {
    setRunningSla(true);
    try {
      const res = await slaApi.triggerCheck();
      alert(`SLA Escalation Engine Executed!\nEvaluated: ${res.summary.evaluated}\nLevel 1 Reminders: ${res.summary.level1_reminders}\nLevel 2 Breaches: ${res.summary.level2_escalations}\nLevel 3 Critical: ${res.summary.level3_critical}`);
      await fetchAssignedIssues();
    } catch (err) {
      alert(`SLA check failed: ${err.message}`);
    } finally {
      setRunningSla(false);
    }
  };

  const fetchAssignedIssues = async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getAssignedIssues({
        department_view: departmentView ? 'true' : 'false'
      });
      setIssues(res.issues || []);
    } catch (err) {
      console.error('Failed to load officer queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedIssues();
  }, [departmentView]);

  if (!isOfficer && !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-bold text-slate-900">Restricted Authority Area</h2>
        <p className="text-xs text-slate-500">
          This portal is reserved for department officers and municipal engineers to manage grievances and SLA deadlines.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-2.5 rounded-xl bg-civic-600 text-white font-bold text-sm shadow-md"
        >
          Sign in as Officer
        </button>
      </div>
    );
  }

  // Calculate Metrics
  const totalCount = issues.length;
  const submittedCount = issues.filter((i) => i.status === 'Submitted').length;
  const inProgressCount = issues.filter((i) => ['Acknowledged', 'In Progress'].includes(i.status)).length;
  const overdueCount = issues.filter((i) => i.is_overdue && !['Resolved', 'Closed'].includes(i.status)).length;

  const filteredIssues = issues.filter((iss) => {
    if (filter === 'Submitted') return iss.status === 'Submitted';
    if (filter === 'In Progress') return ['Acknowledged', 'In Progress'].includes(iss.status);
    if (filter === 'overdue') return iss.is_overdue && !['Resolved', 'Closed'].includes(iss.status);
    return true;
  });

  const openUpdateModal = (issue) => {
    setSelectedIssueForModal(issue);
    // Suggest logical next status
    if (issue.status === 'Submitted') setNewStatus('Acknowledged');
    else if (issue.status === 'Acknowledged') setNewStatus('In Progress');
    else setNewStatus('Resolved');
    setRemarks('');
    setResolutionPhoto(null);
    setErrorMsg('');
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssueForModal) return;

    if (newStatus === 'Resolved' && !resolutionPhoto && !selectedIssueForModal.resolution_proof_url) {
      setErrorMsg("A resolution proof photo ('After' photo) is strictly mandatory to mark an issue as Resolved.");
      return;
    }

    setUpdating(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('remarks', remarks.trim());
      if (resolutionPhoto) {
        formData.append('resolution_photo', resolutionPhoto);
      }

      await issuesApi.updateStatus(selectedIssueForModal.id, formData);
      setSelectedIssueForModal(null);
      await fetchAssignedIssues();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update issue status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Officer Department Header */}
      <div className="bg-gradient-to-r from-slate-900 via-civic-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl space-y-3 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-civic-600/30 border border-civic-400/30 flex items-center justify-center text-civic-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-civic-500/20 text-civic-300 border border-civic-500/30">
                  Officer Dispatch Portal • DFD 5.0
                </span>
                {user?.department_name && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    Dept: {user.department_name}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white mt-0.5">
                {user?.full_name}
              </h2>
            </div>
          </div>

          {/* Department Queue Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDepartmentView(!departmentView)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                departmentView
                  ? 'bg-civic-600 text-white border-civic-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {departmentView ? 'Viewing Full Department Queue' : 'Viewing My Assigned Issues'}
            </button>
            <button
              onClick={handleRunSlaSweep}
              disabled={runningSla}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Execute SLA Escalation Engine Check"
            >
              <Zap className={`w-3.5 h-3.5 ${runningSla ? 'animate-bounce text-amber-300' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{runningSla ? 'Checking...' : 'Run SLA Sweep'}</span>
            </button>
            <button
              onClick={fetchAssignedIssues}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-civic-600" />
            Total In Queue
          </span>
          <p className="text-2xl font-heading font-extrabold text-slate-900">{totalCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Needs Acknowledgment
          </span>
          <p className="text-2xl font-heading font-extrabold text-amber-900">{submittedCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            In Progress
          </span>
          <p className="text-2xl font-heading font-extrabold text-blue-900">{inProgressCount}</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm space-y-1 ${
          overdueCount > 0 ? 'bg-rose-50 border-rose-300 animate-pulse-fast' : 'bg-white border-slate-200/90'
        }`}>
          <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            SLA Breached / Overdue
          </span>
          <p className="text-2xl font-heading font-extrabold text-rose-800">{overdueCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Issues ({totalCount})
        </button>
        <button
          onClick={() => setFilter('Submitted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'Submitted' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Awaiting Review ({submittedCount})
        </button>
        <button
          onClick={() => setFilter('In Progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'In Progress' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Work ({inProgressCount})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'overdue' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Breached ({overdueCount})
        </button>
      </div>

      {/* Assigned Issues Queue */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-civic-600" />
          Loading assigned queue...
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Queue is Clear!</h3>
          <p className="text-xs text-slate-500">No pending issues match this filter view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all space-y-4 ${
                issue.is_overdue
                  ? 'border-rose-300 ring-1 ring-rose-300/50'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2.5 py-0.5 rounded border border-civic-200">
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

                <div className="flex items-center gap-2">
                  <SlaCountdownBadge
                    slaDeadline={issue.sla_deadline}
                    status={issue.status}
                    resolvedAt={issue.resolved_at}
                    isCriticalOverdue={issue.is_critical_overdue}
                  />
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                    {issue.status}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-900">{issue.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Photos */}
              {issue.photos && issue.photos.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {issue.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p.image_url}
                      alt="Grievance evidence"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Footer info & Action button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1 max-w-xs">{issue.address || 'Location registered'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Citizen: <strong>{issue.citizen_name}</strong></span>
                </div>

                <button
                  onClick={() => openUpdateModal(issue)}
                  className="px-4 py-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Update Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Officer Status Transition Modal */}
      {selectedIssueForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-slide-up">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-civic-700">
                  {selectedIssueForModal.ticket_number}
                </span>
                <h3 className="font-heading font-extrabold text-lg text-slate-900">
                  Update Grievance Status
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssueForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              {/* Select Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Next Workflow Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Acknowledged', 'In Progress', 'Resolved'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        newStatus === st
                          ? 'bg-civic-600 text-white border-civic-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mandatory Resolution Warning */}
              {newStatus === 'Resolved' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-950">Resolution Proof Photo Mandatory</p>
                    <p className="text-[11px] text-amber-800">
                      SLA compliance policy requires an &quot;After&quot; photo showing the rectified civic defect before marking as Resolved. Citizens have 72 hours to review.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Officer Remarks / Field Log Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Work crew dispatched with asphalt mixer. Pipe patched and tested under pressure."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs"
                />
              </div>

              {/* Evidence Photo Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-civic-600" />
                    {newStatus === 'Resolved' ? 'Upload Resolution Proof Photo' : 'Optional Progress Photo'}
                  </span>
                  {newStatus === 'Resolved' && !selectedIssueForModal.resolution_proof_url && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Required for Resolved
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setResolutionPhoto(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-civic-50 file:text-civic-700 hover:file:bg-civic-100 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-bold text-xs shadow-md shadow-civic-600/30 transition-all disabled:opacity-50"
                >
                  {updating ? 'Recording...' : `Confirm: Mark as ${newStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
