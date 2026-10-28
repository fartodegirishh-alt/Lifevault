import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext';
import { RecordItem } from '../components/RecordCard';
import StatusBadge from '../components/StatusBadge';
import {
  Search,
  PlusCircle,
  CalendarClock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingData, setUpcomingData] = useState<{
    counts: { total: number; active: number; expiringSoon: number; expired: number; noExpiry: number };
    upcoming: RecordItem[];
  } | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUpcoming(30);
      setUpcomingData(data);
    } catch (err: any) {
      setError(err.details || err.message || 'Failed to load dashboard data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/records?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/records');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#E9E3F8]/50 via-white to-[#DFF1E7]/30 border border-purple-200/60 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E9E3F8] text-purple-900 border border-purple-200">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Personal Document &amp; Warranty Vault</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Keep important documents close, and every expiry date in sight.
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Never misplace a policy or miss a product warranty deadline again. LifeVault securely tracks all your identity, vehicle, insurance, and device papers in one real-time portal.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passport, warranty, policy number..."
                aria-label="Search records"
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3 flex-wrap">
            <Link
              to="/add-document"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-purple-300" />
              <span>Add Document</span>
            </Link>

            <Link
              to="/add-warranty"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E9E3F8] text-purple-950 hover:bg-purple-200 border border-purple-300 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs"
            >
              <ShieldAlert className="w-4 h-4 text-purple-700" />
              <span>Add Warranty</span>
            </Link>

            <Link
              to="/upcoming"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs"
            >
              <CalendarClock className="w-4 h-4 text-slate-500" />
              <span>Upcoming Dates</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Error state with Retry */}
      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-[#F8E5E7] border border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-700 shrink-0" />
            <div>
              <div className="font-bold text-sm">Failed to connect to backend database</div>
              <div className="text-xs text-rose-800">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-5" />
          ))}
        </div>
      )}

      {/* Metric Cards */}
      {!loading && upcomingData && (
        <section aria-label="Vault Statistics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Status Overview</h2>
            <span className="text-xs text-slate-500 font-medium">
              Calculated live from database ({upcomingData.counts.total} total records)
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Active */}
            <Link
              to="/records?status=Active"
              className="bg-[#DFF1E7]/70 border border-emerald-200 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-950 mt-2">
                {upcomingData.counts.active}
              </div>
              <div className="text-xs text-emerald-800 font-medium mt-1 group-hover:underline">
                View active records &rarr;
              </div>
            </Link>

            {/* Expiring Soon */}
            <Link
              to="/records?status=Expiring soon"
              className="bg-[#FFF3D6] border border-amber-300 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-amber-900">
                <span className="text-xs font-bold uppercase tracking-wider">Expiring Soon</span>
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-3xl font-extrabold text-amber-950 mt-2">
                {upcomingData.counts.expiringSoon}
              </div>
              <div className="text-xs text-amber-800 font-medium mt-1 group-hover:underline">
                Within 30-day window &rarr;
              </div>
            </Link>

            {/* Expired */}
            <Link
              to="/records?status=Expired"
              className="bg-[#F8E5E7] border border-rose-300 rounded-2xl p-5 hover:border-rose-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-rose-900">
                <span className="text-xs font-bold uppercase tracking-wider">Expired</span>
                <AlertCircle className="w-5 h-5 text-rose-700" />
              </div>
              <div className="text-3xl font-extrabold text-rose-950 mt-2">
                {upcomingData.counts.expired}
              </div>
              <div className="text-xs text-rose-800 font-medium mt-1 group-hover:underline">
                Past renewal date &rarr;
              </div>
            </Link>

            {/* No Expiry */}
            <Link
              to="/records?status=No expiry date"
              className="bg-[#E9E3F8]/80 border border-purple-200 rounded-2xl p-5 hover:border-purple-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-purple-900">
                <span className="text-xs font-bold uppercase tracking-wider">No Expiry Date</span>
                <FileText className="w-5 h-5 text-purple-700" />
              </div>
              <div className="text-3xl font-extrabold text-purple-950 mt-2">
                {upcomingData.counts.noExpiry}
              </div>
              <div className="text-xs text-purple-800 font-medium mt-1 group-hover:underline">
                Permanent records &rarr;
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Upcoming / Urgent Records Widget */}
      {!loading && upcomingData && upcomingData.upcoming.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-600" />
                <span>Urgent: Expiring Within 30 Days</span>
              </h2>
              <p className="text-xs text-slate-500">
                These documents or warranties require prompt renewal or inspection.
              </p>
            </div>
            <Link
              to="/upcoming"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 hover:text-purple-950 bg-[#E9E3F8] px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>View full timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingData.upcoming.slice(0, 5).map((rec) => {
              const targetDate = rec.type === 'warranty' ? rec.warranty_end_date : rec.expiry_date;
              return (
                <div
                  key={rec.id}
                  className="py-3.5 flex items-center justify-between gap-4 flex-wrap hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {rec.category}
                      </span>
                      <Link
                        to={`/records/${rec.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-purple-800 transition-colors"
                      >
                        {rec.title}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500">
                      Target Date: <strong>{targetDate}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={rec.expiry_status} daysLeft={rec.days_left} />
                    <Link
                      to={`/records/${rec.id}`}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 p-1"
                    >
                      View &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Navigation Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/records"
          className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-800 transition-colors">
              Browse All Records
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Search by keyword, filter by categories like Identity, Vehicle, Insurance, and filter by status.
            </p>
          </div>
          <div className="mt-4 text-xs font-bold text-purple-800 flex items-center gap-1">
            <span>Explore directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/upcoming"
          className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-800 transition-colors">
              Upcoming Timeline &amp; Alerts
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Adjustable 7, 30, and 60-day reminder windows and in-app notifications generated by the cron job.
            </p>
          </div>
          <div className="mt-4 text-xs font-bold text-amber-800 flex items-center gap-1">
            <span>Open reminder timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/system-status"
          className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
              System Diagnostics
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Live backend connectivity verification, SQLite database stats, uptime metrics, and cron status.
            </p>
          </div>
          <div className="mt-4 text-xs font-bold text-emerald-800 flex items-center gap-1">
            <span>View live telemetry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </section>
    </div>
  );
}

export default HomePage;
