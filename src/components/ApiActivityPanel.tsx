import React, { useState, useEffect } from 'react';
import { subscribeToApiActivity, getApiActivityLogs, clearApiActivityLogs } from '../api.js';
import { Activity, ChevronDown, ChevronUp, Trash2, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';

export function ApiActivityPanel() {
  const [logs, setLogs] = useState(() => getApiActivityLogs());
  const [isOpen, setIsOpen] = useState(false);
  const [filterErrors, setFilterErrors] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToApiActivity((updatedLogs: any[]) => {
      setLogs(updatedLogs);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const filteredLogs = filterErrors ? logs.filter((l) => l.isError) : logs;
  const failureCount = logs.filter((l) => l.isError).length;

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'POST':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PUT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <aside
      aria-label="API Activity Inspector"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-300 shadow-2xl transition-all duration-300 ease-in-out font-sans"
    >
      {/* Collapsed / Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white select-none">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2.5 text-xs font-semibold hover:text-emerald-300 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded px-1"
          aria-expanded={isOpen}
          aria-controls="api-activity-details"
        >
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>API Activity Inspector</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {logs.length} request{logs.length === 1 ? '' : 's'}
          </span>
          {failureCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-600 text-white">
              {failureCount} Failed
            </span>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronUp className="w-4 h-4 ml-1" />}
        </button>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline text-slate-400 font-mono text-[11px]">
            Single client/src/api.js service
          </span>
          {isOpen && (
            <button
              onClick={() => clearApiActivityLogs()}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Clear log history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Log Drawer */}
      {isOpen && (
        <div id="api-activity-details" className="max-h-72 overflow-y-auto bg-slate-950 text-slate-200 p-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                <input
                  type="checkbox"
                  checked={filterErrors}
                  onChange={(e) => setFilterErrors(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-400"
                />
                Show failures only ({failureCount})
              </label>
            </div>
            <div className="text-[11px] text-slate-400">
              Live HTTP request timings & responses
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No network requests logged yet. Interact with the application to see live API calls.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start justify-between gap-3 p-2 rounded border text-[11px] ${
                    entry.isError
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="text-slate-500 text-[10px] w-14 shrink-0">{entry.timestamp}</span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getMethodBadgeClass(
                        entry.method
                      )}`}
                    >
                      {entry.method}
                    </span>

                    <span className="font-mono text-slate-300 break-all truncate max-w-md" title={entry.endpoint}>
                      {entry.endpoint}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 text-[11px]">{entry.durationMs} ms</span>

                    {entry.isError ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white">
                        <XCircle className="w-3 h-3" />
                        <span>Failed ({entry.status})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{entry.status}</span>
                      </span>
                    )}
                  </div>

                  {entry.details && (
                    <div className="w-full text-[10px] text-slate-400 mt-1 pl-16 border-t border-slate-800/50 pt-1">
                      {entry.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default ApiActivityPanel;
