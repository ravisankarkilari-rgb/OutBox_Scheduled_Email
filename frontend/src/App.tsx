import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { ScheduledQueue } from './pages/ScheduledQueue';
import { SentLog } from './pages/SentLog';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { SmtpSettingsModal } from './components/SmtpSettingsModal';
import { ProtectedRoute } from './components/ProtectedRoute';

function AppContent() {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCampaignCreated = () => {
    // Force rerender in components listening to stats/lists reload
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <Routes>
        {/* Public authentication gateways */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected Dashboard panel layouts */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout 
                onOpenCompose={() => setIsComposeOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
              >
                <Dashboard key={refreshTrigger} onOpenCompose={() => setIsComposeOpen(true)} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduled"
          element={
            <ProtectedRoute>
              <DashboardLayout 
                onOpenCompose={() => setIsComposeOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
              >
                <ScheduledQueue key={refreshTrigger} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sent"
          element={
            <ProtectedRoute>
              <DashboardLayout 
                onOpenCompose={() => setIsComposeOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
              >
                <SentLog key={refreshTrigger} />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onCampaignCreated={handleCampaignCreated}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SmtpSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
