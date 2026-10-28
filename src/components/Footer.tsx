import React from 'react';
import { Link } from 'react-router-dom';
import { Database, ShieldCheck, Server, Cpu } from 'lucide-react';
import { useConnection } from '../context/ConnectionContext';

export function Footer() {
  const { isConnected, latencyMs, healthData } = useConnection();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8 pb-16 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand & Data Source */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#E9E3F8] flex items-center justify-center text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-800" />
            </div>
            <div>
              <div className="font-bold text-slate-800">LifeVault Portal</div>
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Data source: SQLite via LifeVault API</span>
              </div>
            </div>
          </div>

          {/* Architecture Badge */}
          <div className="flex items-center gap-4 text-slate-500 text-xs flex-wrap justify-center">
            <span className="inline-flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Node.js Express REST</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>Uptime: {healthData?.uptime ? `${Math.floor(healthData.uptime / 60)}m ${healthData.uptime % 60}s` : 'Active'}</span>
            </span>
            <span>•</span>
            <Link to="/system-status" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              System Diagnostics
            </Link>
          </div>

          {/* Privacy Note */}
          <div className="text-slate-400 text-center md:text-right">
            <span>Prototype environment • Fictional data only</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
