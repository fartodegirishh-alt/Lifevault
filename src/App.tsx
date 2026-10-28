/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ConnectionProvider } from './context/ConnectionContext';

import Header from './components/Header';
import Footer from './components/Footer';
import PrototypeBanner from './components/PrototypeBanner';
import ApiActivityPanel from './components/ApiActivityPanel';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import RecordsPage from './pages/RecordsPage';
import AddDocumentPage from './pages/AddDocumentPage';
import AddWarrantyPage from './pages/AddWarrantyPage';
import RecordDetailPage from './pages/RecordDetailPage';
import UpcomingPage from './pages/UpcomingPage';
import SystemStatusPage from './pages/SystemStatusPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ConnectionProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col bg-[#FCFBF8] text-slate-800">
              {/* Header and alerts */}
              <PrototypeBanner />
              <Header />

              {/* Main routing container */}
              <main className="flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/system-status" element={<SystemStatusPage />} />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/records"
                    element={
                      <ProtectedRoute>
                        <RecordsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/records/:id"
                    element={
                      <ProtectedRoute>
                        <RecordDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/add-document"
                    element={
                      <ProtectedRoute>
                        <AddDocumentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/add-warranty"
                    element={
                      <ProtectedRoute>
                        <AddWarrantyPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/upcoming"
                    element={
                      <ProtectedRoute>
                        <UpcomingPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 Fallback */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>

              {/* Footer and Collapsible Telemetry Panel */}
              <Footer />
              <ApiActivityPanel />
            </div>
          </ToastProvider>
        </AuthProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}
