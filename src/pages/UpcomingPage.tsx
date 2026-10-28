import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import { RecordItem } from '../components/RecordCard';
import {
  CalendarClock,
  Bell,
  CheckCheck,
  Check,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  ShieldAlert,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface NotificationItem {
  id: number;
  user_id: number;
  record_id: number;
  message: string;
  is_read: number;
  created_at: string;
  record_title?: string;
  record_type?: string;
}

export function UpcomingPage() {
  const { showToast } = useToast();

  const [windowDays, setWindowDays] = useState<number>(30);
  const [timelineRecords, setTimelineRecords] = useState<RecordItem[]>([]);
  const [counts, setCounts] = useState<{ total: number; active: number; expiringSoon: number; expired: number; noExpiry: number } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTriggeringCron, setIsTriggeringCron] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcomingRes, notifsRes] = await Promise.all([
        api.getUpcoming(windowDays),
        api.getNotifications(),
      ]);

      setTimelineRecords(windowDays === 9999 ? upcomingRes.allSorted : upcomingRes.upcoming);
      setCounts(upcomingRes.counts);
      setNotifications(notifsRes.notifications || []);
    } catch (err: any) {
      setError(err.details || err.message || 'Failed to load upcoming timeline from server');
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsRead = async (notifId: number) => {
    try {
      await api.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n))
      );
      showToast('Notification marked as read', 'info', 2000);
    } catch (err: any) {
      showToast(err.details || err.message || 'Failed to mark notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      showToast('All notifications marked as read', 'success');
    } catch (err: any) {
      showToast(err.details || err.message || 'Failed to update notifications', 'error');
    }
  };

  const handleTriggerCronScan = async () => {
    setIsTriggeringCron(true);
    try {
      const res = await api.runReminderCheck();
      showToast(`Reminder scan executed: ${res.result?.summary || 'Completed'}`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.details || err.message || 'Failed to trigger reminder scan', 'error');
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-amber-600" />
            <span>Upcoming Expiries &amp; Reminders</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Timeline sorted by nearest expiry/warranty end date. Powered by daily background cron evaluation.
          </p>
        </div>

        {/* Trigger Cron Scan Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerCronScan}
            disabled={isTriggeringCron}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isTriggeringCron ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isTriggeringCron ? 'Scanning Database...' : 'Run Reminder Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* Reminder Window Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Reminder Window:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'Next 7 Days', days: 7 },
            { label: 'Next 30 Days (Default)', days: 30 },
            { label: 'Next 60 Days', days: 60 },
            { label: 'All Upcoming Dates', days: 9999 },
          ].map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => setWindowDays(item.days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                windowDays === item.days
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-[#F8E5E7] border border-rose-300 text-rose-950 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-700 shrink-0" />
            <div>
              <div className="font-bold text-sm">Failed to retrieve upcoming dates</div>
              <div className="text-xs text-rose-800">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Two Column Layout: Timeline (Left) & Notifications (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Sorted Timeline (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Chronological Expiry Timeline ({timelineRecords.length} records)
            </h2>
            <span className="text-xs text-slate-500">Sorted most urgent first</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : timelineRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
              <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">No records expiring within this window</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try selecting "Next 60 Days" or "All Upcoming Dates" to view future expirations.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {timelineRecords.map((item) => {
                const isWarranty = item.type === 'warranty';
                const targetDate = isWarranty ? item.warranty_end_date : item.expiry_date;
                const isUrgent = item.days_left !== null && item.days_left !== undefined && item.days_left <= 7;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-xs ${
                      isUrgent
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isWarranty
                              ? 'bg-[#E9E3F8] text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {isWarranty ? <ShieldAlert className="w-3 h-3 text-purple-700" /> : <FileText className="w-3 h-3 text-slate-600" />}
                          {isWarranty ? 'Warranty' : 'Document'}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                      </div>

                      <Link
                        to={`/records/${item.id}`}
                        className="text-base font-bold text-slate-900 hover:text-purple-800 transition-colors block truncate"
                      >
                        {item.title}
                      </Link>

                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>
                          {isWarranty ? 'Warranty End:' : 'Expires:'} <strong>{targetDate}</strong>
                        </span>
                        {item.receipt_location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{item.receipt_location}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:self-center">
                      <StatusBadge status={item.expiry_status} daysLeft={item.days_left} />
                      <Link
                        to={`/records/${item.id}`}
                        className="p-2 text-slate-400 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: In-App Notifications List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-800" />
              <h2 className="text-lg font-bold text-slate-900">In-App Reminders</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="text-[11px] text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Automated cron notifications</span>
              <span className="font-mono text-[10px]">Daily 00:00 &amp; start</span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No reminders generated yet. Click "Run Reminder Scan Now" above to trigger.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-2xl border text-xs transition-colors flex items-start justify-between gap-3 ${
                      notif.is_read
                        ? 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                        : 'bg-[#E9E3F8]/40 border-purple-200 text-purple-950 font-medium'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="leading-snug">{notif.message}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{notif.created_at}</span>
                        {notif.record_id && (
                          <>
                            <span>•</span>
                            <Link
                              to={`/records/${notif.record_id}`}
                              className="text-purple-700 hover:underline font-semibold"
                            >
                              View record #{notif.record_id}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors shrink-0"
                        title="Mark as read"
                        aria-label="Mark notification as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpcomingPage;
