// DFD 7.0 - In-App Notification Bell Drawer Component
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/useLanguage';
import { notificationsApi } from '../services/api';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  ArrowUpRight, 
  CheckCircle2, 
  Info,
  ExternalLink
} from 'lucide-react';

export const NotificationDrawer = ({ isOpen, onClose, onNavigate }) => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications({ limit: 40 });
      setNotifications(res.notifications || []);
      setTotalUnread(res.total_unread || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setTotalUnread((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setTotalUnread(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    onClose();
    if (notif.issue_id) {
      onNavigate('feed');
    }
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'critical_overdue':
        return <AlertOctagon className="w-5 h-5 text-rose-600" />;
      case 'sla_breach':
      case 'escalation_level_2':
      case 'citizen_escalation':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'sla_reminder':
      case 'escalation_level_1':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'status_change':
        return <CheckCircle2 className="w-5 h-5 text-civic-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-fade-in flex justify-end">
      {/* Slide-out Drawer Panel */}
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-civic-100 text-civic-700 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>{t('notifications')}</span>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                    {totalUnread} {t('unread')}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Live alerts, SLA milestones & escalations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        {notifications.length > 0 && totalUnread > 0 && (
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{totalUnread} unread alert(s)</span>
            <button
              onClick={handleMarkAllRead}
              className="text-civic-700 hover:text-civic-900 font-bold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t('mark_all_read')}</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-medium">
              <Clock className="w-4 h-4 animate-spin text-civic-600" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                {t('no_notifications')}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  !notif.is_read
                    ? 'bg-civic-50/50 border-civic-200 hover:bg-civic-50 shadow-sm'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    !notif.is_read ? 'bg-white shadow-sm' : 'bg-slate-100'
                  }`}>
                    {getIcon(notif.notification_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold leading-tight ${
                        !notif.is_read ? 'text-slate-900' : 'text-slate-700'
                      }`}>
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-civic-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>
                        {notif.created_at
                          ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                          : 'Just now'}
                      </span>
                      {notif.issue_id && (
                        <span className="font-semibold text-civic-700 flex items-center gap-0.5">
                          View details <ArrowUpRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
