import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";

import msalConfig from "config/msalConfig";
import { AuthProvider, useAuth } from "context/AuthContext";
import AdminLayout from "layouts/admin";
import AuthLayout from "layouts/auth";
import ProtectedRoute from "components/ProtectedRoute";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

/**
 * AppContent Component
 * Separated from App to use MSAL hooks which require MsalProvider wrapper
 */
const AppContent = () => {
  const { accounts } = useMsal();
  const { isLoading } = useAuth();

  // Redirect authenticated users from login page to dashboard
  useEffect(() => {
    if (!isLoading && accounts.length > 0 && window.location.pathname === "/auth/sign-in") {
      window.location.href = "/admin";
    }
  }, [accounts, isLoading]);

  return (
    <Routes>
      <Route path="auth/*" element={<AuthLayout />} />
      <Route
        path="admin/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/admin" replace />} />
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
        <AppContent />
      </AuthProvider>
    </MsalProvider>
  );
};

export default App;
