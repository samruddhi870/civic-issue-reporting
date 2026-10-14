// DFD 9.0 - Municipal Admin Analytics & Performance Command Center
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { analyticsApi, slaApi } from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Award, 
  Building2, 
  Star, 
  Zap, 
  ShieldCheck, 
  FileSpreadsheet,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AdminDashboard = ({ onNavigate }) => {
  const { user, isAdmin, isOfficer } = useAuth();
  const { t } = useLanguage();

  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringSla, setTriggeringSla] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, departments, leaderboard, sla

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, deptRes, catRes, leadRes, slaRes] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getByDepartment(),
        analyticsApi.getByCategory(),
        analyticsApi.getLeaderboard(),
        slaApi.getSlaMatrix()
      ]);

      setSummary(sumRes);
      setDepartments(deptRes.departments || []);
      setCategories(catRes.categories || {});
      setLeaderboard(leadRes.leaderboard || []);
      setSlaRules(slaRes.rules || []);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleManualSlaSweep = async () => {
    setTriggeringSla(true);
    try {
      const res = await slaApi.triggerCheck();
      alert(`SLA Sweep Completed! Scanned ${res.total_checked} issues. ${res.escalations_triggered} escalations triggered.`);
      await fetchDashboardData();
    } catch (err) {
      alert('SLA Sweep failed: ' + err.message);
    } finally {
      setTriggeringSla(false);
    }
  };

  const handleExportCsv = () => {
    const url = analyticsApi.getCsvExportUrl();
    window.open(url, '_blank');
  };

  const handleExportPdf = () => {
    const url = analyticsApi.getPdfExportUrl();
    window.open(url, '_blank');
  };


  if (!isAdmin && !isOfficer) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-heading font-bold text-slate-900">Restricted Administration Portal</h2>
        <p className="text-xs text-slate-500">
          This command center is reserved for Municipal Commissioners, Administrative Officers, and Department Heads.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-2.5 rounded-xl bg-civic-600 text-white font-bold text-xs shadow-md hover:bg-civic-700"
        >
          Sign in with Authorized Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Executive Command Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-civic-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-civic-600/30 border border-civic-400/30 flex items-center justify-center text-civic-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-civic-500/20 text-civic-300 border border-civic-500/30">
                  Municipal Analytics Command • DFD 9.0
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white mt-0.5">
                Executive SLA & Resolution Intelligence
              </h2>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white text-xs font-bold shadow-md shadow-civic-600/20 transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export PDF Audit</span>
            </button>


            <button
              onClick={handleManualSlaSweep}
              disabled={triggeringSla}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${triggeringSla ? 'animate-spin' : ''}`} />
              <span>{triggeringSla ? 'Checking...' : 'Run SLA Sweep'}</span>
            </button>

            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
            { id: 'departments', label: 'Departments & Caseload', icon: Building2 },
            { id: 'leaderboard', label: 'Officer Leaderboard', icon: Award },
            { id: 'sla', label: 'SLA Matrix Rules', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-civic-600 text-white shadow-md shadow-civic-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-civic-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Aggregating municipal telemetry...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary KPI Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. SLA Compliance Rate */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">SLA Compliance Rate</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
                      {summary?.sla_compliance_rate || 100}%
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      On-Time
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${summary?.sla_compliance_rate || 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Resolved strictly within category deadline</p>
                </div>

                {/* 2. Average Resolution Time */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Avg Resolution Time</span>
                    <Clock className="w-4 h-4 text-civic-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
                      {summary?.avg_resolution_hours || 0}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Hours</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-civic-600 h-full rounded-full w-3/4" />
                  </div>
                  <p className="text-[10px] text-slate-400">From citizen intake to confirmed proof</p>
                </div>

                {/* 3. Total Grievances */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Total Grievances</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
                      {summary?.total_issues || 0}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({summary?.active_issues || 0} Active)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <span className="text-emerald-700 font-bold">{summary?.resolved_issues || 0} Resolved</span>
                    <span>•</span>
                    <span className="text-blue-700 font-bold">{summary?.closed_issues || 0} Closed</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Total municipal caseload registered</p>
                </div>

                {/* 4. Citizen Satisfaction */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Citizen Satisfaction</span>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
                      {summary?.avg_citizen_rating || 5.0}
                    </span>
                    <span className="text-xs font-bold text-amber-600">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(summary?.avg_citizen_rating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">Based on verified 1–5 star reviews</p>
                </div>
              </div>

              {/* Category Breakdown & Overdue Alert Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Caseload Distribution */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                  <h3 className="font-heading font-bold text-base text-slate-900 flex items-center justify-between">
                    <span>Grievances by Category</span>
                    <span className="text-xs text-slate-400 font-normal">Active & Historical</span>
                  </h3>

                  <div className="space-y-3">
                    {Object.entries(categories).map(([cat, count]) => {
                      const total = summary?.total_issues || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{cat}</span>
                            <span className="font-mono text-slate-500">{count} issues ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-civic-600 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overdue Health Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      <span>SLA Escalation Alert</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">
                      {summary?.overdue_issues || 0}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Active grievances currently exceeding official SLA turnaround deadlines. APScheduler cron automatically routes reminders and escalations.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700 space-y-2">
                    <button
                      onClick={handleManualSlaSweep}
                      disabled={triggeringSla}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Trigger Escalation Sweep Now</span>
                    </button>
                    <button
                      onClick={() => onNavigate('map')}
                      className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Inspect On Geographic Map</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPARTMENTS & CASELOAD */}
          {activeTab === 'departments' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900">
                    Municipal Departments Performance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time workload distribution and SLA compliance across municipal divisions.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4 text-center">Total Issues</th>
                      <th className="py-3 px-4 text-center">Active</th>
                      <th className="py-3 px-4 text-center">Resolved</th>
                      <th className="py-3 px-4 text-center">Overdue</th>
                      <th className="py-3 px-4 text-right">SLA Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <tr key={dept.department_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-civic-600" />
                          <span>{dept.department_name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                          {dept.department_code}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {dept.total_issues}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                          {dept.active_issues}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">
                          {dept.resolved_issues}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {dept.overdue_issues > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              {dept.overdue_issues} Breached
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-bold px-2.5 py-1 rounded-full text-xs ${
                            dept.sla_compliance_rate >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {dept.sla_compliance_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICER LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Officer Resolution Velocity & Citizen Rating Leaderboard</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recognizing field officers based on resolved volume, SLA punctuality, and verified citizen satisfaction.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-center">Rank</th>
                      <th className="py-3 px-4">Field Officer</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Assigned</th>
                      <th className="py-3 px-4 text-center">Resolved</th>
                      <th className="py-3 px-4 text-center">On-Time SLA %</th>
                      <th className="py-3 px-4 text-center">Avg Hours (ART)</th>
                      <th className="py-3 px-4 text-right">Satisfaction Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((off, idx) => (
                      <tr key={off.officer_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-amber-50 text-amber-700' :
                            'text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {off.officer_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {off.department_name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {off.total_assigned}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                          {off.resolved_count}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {off.on_time_pct}%
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {off.avg_resolution_hours}h
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            {off.avg_citizen_rating}/5
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SLA MATRIX RULES */}
          {activeTab === 'sla' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-civic-600" />
                    <span>Configured SLA Resolution Rules & Escalation Thresholds</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Municipal turnaround deadlines and automatic trigger points for notifications.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Grievance Category</th>
                      <th className="py-3 px-4">Target Department</th>
                      <th className="py-3 px-4 text-center">SLA Deadline (Hours)</th>
                      <th className="py-3 px-4 text-center">Reminder Threshold</th>
                      <th className="py-3 px-4 text-center">Breach Threshold</th>
                      <th className="py-3 px-4 text-center">Critical Escalation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slaRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {rule.category}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rule.department_name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                            {rule.sla_hours} hrs ({rule.sla_hours / 24} days)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-amber-700 font-semibold">
                          {rule.reminder_pct}% (Officer reminder)
                        </td>
                        <td className="py-3.5 px-4 text-center text-orange-700 font-semibold">
                          {rule.breach_pct}% (Dept Head escalation)
                        </td>
                        <td className="py-3.5 px-4 text-center text-rose-700 font-bold">
                          {rule.critical_pct}% (Admin intervention)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
