import React from "react";
import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "context/AuthContext";
import UnauthorizedAccess from "./UnauthorizedAccess";

/**
 * ProtectedRoute Component
 * Redirects to login page if user is not authenticated
 * Shows unauthorized page if user is authenticated but doesn't have required roles
 * Shows loading spinner while authentication is in progress
 */
export default function ProtectedRoute({ children }) {
  const { accounts, inProgress } = useMsal();
  const { isLoading, hasRequiredRole, userGroups } = useAuth();

  // Show loading state while MSAL is initializing or processing login
  if (isLoading || inProgress !== "none") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (accounts.length === 0) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Show unauthorized page if user doesn't have required roles
  // Wait until userGroups are loaded (empty array is valid but undefined means still loading)
  if (userGroups !== undefined && !hasRequiredRole()) {
    return <UnauthorizedAccess />;
  }

  return children;
}
