import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { api } from '../api.js';
import {
  ShieldCheck,
  FolderOpen,
  CalendarClock,
  Activity,
  PlusCircle,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, latencyMs, checkConnection } = useConnection();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch unread notifications count when authenticated
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      api.getNotifications()
        .then((res: any) => {
          if (isMounted && res && typeof res.unreadCount === 'number') {
            setUnreadNotifications(res.unreadCount);
          }
        })
        .catch(() => {});
    } else {
      setUnreadNotifications(0);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  const navLinks = [
    { name: 'All Records', path: '/records', icon: FolderOpen },
    { name: 'Upcoming Dates', path: '/upcoming', icon: CalendarClock, badge: unreadNotifications },
    { name: 'System Status', path: '/system-status', icon: Activity },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-slate-900 group focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg p-1"
              aria-label="LifeVault Home"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E9E3F8] border border-purple-200 flex items-center justify-center text-purple-900 shadow-sm group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-purple-800" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900">LifeVault</span>
                <span className="hidden sm:inline-block ml-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-[#E9E3F8] px-1.5 py-0.5 rounded">
                  PORTAL
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        active
                          ? 'bg-[#E9E3F8] text-purple-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>{link.name}</span>
                      {link.badge && link.badge > 0 ? (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          {link.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            
            {/* Connection Pill */}
            <Link
              to="/system-status"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                isConnected
                  ? 'bg-[#DFF1E7] text-emerald-950 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-[#F8E5E7] text-rose-950 border-rose-300 hover:bg-rose-100 animate-pulse'
              }`}
              title="Click to view detailed System Status"
              aria-label={isConnected ? `Backend Connected, latency ${latencyMs || 0} milliseconds` : 'Backend Disconnected'}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Backend: Connected {latencyMs !== null ? `(${latencyMs} ms)` : ''}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-700" />
                  <span>Backend: Disconnected</span>
                </>
              )}
            </Link>

            {/* Quick Add Dropdown / Buttons */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  to="/add-document"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-purple-300" />
                  <span>Add Document</span>
                </Link>
                <Link
                  to="/add-warranty"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E9E3F8] text-purple-950 hover:bg-purple-200 border border-purple-300/60 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-purple-700" />
                  <span>Add Warranty</span>
                </Link>
              </div>
            )}

            {/* User Session Info / Logout */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</span>
                  <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]" title={user?.email}>
                    {user?.email}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign out of LifeVault"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In / Demo</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-lg text-xs mb-2">
                  <div className="font-bold text-slate-800">{user?.name}</div>
                  <div className="text-slate-500">{user?.email}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pb-2">
                  <Link
                    to="/add-document"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Document</span>
                  </Link>
                  <Link
                    to="/add-warranty"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#E9E3F8] text-purple-950 border border-purple-300"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-purple-700" />
                    <span>+ Warranty</span>
                  </Link>
                </div>

                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                        active ? 'bg-[#E9E3F8] text-purple-950 font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{link.name}</span>
                      </div>
                      {link.badge && link.badge > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                          {link.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-sm"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
