// DFD 4.0 - Live SLA Countdown & Urgency Badge Component
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const SlaCountdownBadge = ({ slaDeadline, status, resolvedAt, isCriticalOverdue, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState({
    seconds: 0,
    isOverdue: false,
    text: '',
  });

  useEffect(() => {
    function compute() {
      if (!slaDeadline) return;

      const now = new Date();
      const deadline = new Date(slaDeadline);
      const isResolved = status === 'Resolved' || status === 'Closed';

      let diffMs;
      if (isResolved && resolvedAt) {
        diffMs = deadline - new Date(resolvedAt);
      } else {
        diffMs = deadline - now;
      }

      const isOverdue = diffMs < 0;
      const absDiff = Math.abs(diffMs);

      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      let text;
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        text = `${days}d ${remHours}h left`;
      } else {
        text = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      setTimeLeft({
        seconds: Math.floor(diffMs / 1000),
        isOverdue,
        hours,
        minutes,
        text,
        isResolved,
      });
    }

    compute();
    const timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [slaDeadline, status, resolvedAt]);

  if (!slaDeadline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>SLA: Pending</span>
      </span>
    );
  }

  if (timeLeft.isResolved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Resolved
      </span>
    );
  }

  if (isCriticalOverdue || (timeLeft.isOverdue && timeLeft.hours >= 48)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white border border-rose-700 shadow-md animate-pulse">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-200" />
        <span>CRITICAL OVERDUE (+{timeLeft.hours}h)</span>
      </span>
    );
  }

  if (timeLeft.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-sm animate-pulse-fast">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        <span>OVERDUE (+{timeLeft.hours}h {timeLeft.minutes}m)</span>
      </span>
    );
  }

  // Warning when less than 6 hours remaining
  if (timeLeft.hours < 6) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
        <span>SLA: {timeLeft.text}</span>
      </span>
    );
  }

  // Normal safe SLA
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
      <Clock className="w-3.5 h-3.5 text-emerald-600" />
      <span>SLA: {timeLeft.text}</span>
    </span>
  );
};
