import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";

import msalConfig from "config/msalConfig";
import { AuthProvider, useAuth } from "context/AuthContext";
import AdminLayout from "layouts/admin";
import AuthLayout from "layouts/auth";
import ProtectedRoute from "components/ProtectedRoute";
import PortalRoute from "components/PortalRoute";
import { LanguageProvider } from "context/LanguageContext";
import { PortalIds } from "constants/portals";
import StudentPortal from "views/portals/StudentPortal";
import TeacherPortal from "views/portals/TeacherPortal";
import MaintainerPortal from "views/portals/MaintainerPortal";
import ProfilePage from "views/profile";
import NoPortalAccessPage from "views/noPortalAccess";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

const LandingRedirect = () => {
  const { accounts, inProgress } = useMsal();
  const { isLoading, selectedPortalId, getAvailablePortals } = useAuth();

  if (isLoading || inProgress !== "none") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-navy-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  const portals = getAvailablePortals();

  if (portals.length === 0) {
    return <Navigate to="/no-portal-access" replace />;
  }

  const selectedPortal = portals.find((portal) => portal.id === selectedPortalId);
  if (selectedPortal) {
    return <Navigate to={selectedPortal.path} replace />;
  }

  if (portals.length === 1) {
    return <Navigate to={portals[0].path} replace />;
  }

  return <Navigate to={portals[0].path} replace />;
};

/**
 * AppContent Component
 * Separated from App to use MSAL hooks which require MsalProvider wrapper
 */
const AppContent = () => {
  return (
    <Routes>
      <Route path="auth/*" element={<AuthLayout />} />
      <Route
        path="profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/*"
        element={
          <PortalRoute portalId={PortalIds.Admin}>
            <AdminLayout />
          </PortalRoute>
        }
      />
      <Route
        path="student"
        element={
          <PortalRoute portalId={PortalIds.Student}>
            <StudentPortal />
          </PortalRoute>
        }
      />
      <Route
        path="teacher"
        element={
          <PortalRoute portalId={PortalIds.Teacher}>
            <TeacherPortal />
          </PortalRoute>
        }
      />
      <Route
        path="maintainer"
        element={
          <PortalRoute portalId={PortalIds.Maintainer}>
            <MaintainerPortal />
          </PortalRoute>
        }
      />
      <Route
        path="no-portal-access"
        element={
          <ProtectedRoute>
            <NoPortalAccessPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  );
};

/**
 * App Component
 * Root component wrapped with MSAL and Auth providers
 */
const App = () => {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </MsalProvider>
  );
};

export default App;
