import React from 'react';
import { useConnection } from '../context/ConnectionContext';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export function PrototypeBanner() {
  const { isConnected, isChecking, checkConnection } = useConnection();

  return (
    <div className="flex flex-col">
      {/* Backend Disconnection Banner */}
      {!isConnected && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" aria-hidden="true" />
              <span>
                <strong>Cannot reach server.</strong> Your changes are not saved.
              </span>
            </div>
            <button
              onClick={() => checkConnection()}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Reconnecting...' : 'Retry Connection'}
            </button>
          </div>
        </div>
      )}

      {/* Prototype Warning Banner */}
      <div className="bg-[#E9E3F8] border-b border-purple-200/80 text-purple-950 px-4 py-1.5 text-xs font-medium text-center flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-purple-700 shrink-0" aria-hidden="true" />
        <span>
          <strong>Prototype.</strong> Use fictional data only. Do not upload real identity documents or private receipts.
        </span>
      </div>
    </div>
  );
}

export default PrototypeBanner;
