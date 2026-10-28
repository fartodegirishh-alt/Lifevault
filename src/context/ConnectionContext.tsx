import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../api.js';

export interface HealthData {
  status: string;
  db: string;
  uptime: number;
  timestamp: string;
  version: string;
  serverStartedAt?: string;
  cronLastRun?: string | null;
  cronSummary?: string;
  emailStatus?: string;
  emailConfigured?: boolean;
  storage?: {
    status: string;
    filesCount: number;
    path: string;
  };
}

interface ConnectionContextType {
  isConnected: boolean;
  latencyMs: number | null;
  healthData: HealthData | null;
  lastCheckTime: Date | null;
  lastSuccessfulSync: Date | null;
  isChecking: boolean;
  errorMessage: string | null;
  checkConnection: () => Promise<void>;
  apiUrl: string;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    const start = performance.now();
    try {
      const data = await api.getHealth();
      const elapsed = Math.round(performance.now() - start);

      setLatencyMs(elapsed);
      setHealthData(data);
      setIsConnected(true);
      setErrorMessage(null);
      setLastCheckTime(new Date());
      setLastSuccessfulSync(new Date());
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setIsConnected(false);
      setErrorMessage(err.message || 'Cannot connect to backend server');
      setLastCheckTime(new Date());
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Poll GET /api/health every 10 seconds
  useEffect(() => {
    checkConnection();
    const interval = setInterval(() => {
      checkConnection();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        isConnected,
        latencyMs,
        healthData,
        lastCheckTime,
        lastSuccessfulSync,
        isChecking,
        errorMessage,
        checkConnection,
        apiUrl: API_BASE_URL,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
