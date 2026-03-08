import React from "react";
import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "context/AuthContext";

export default function PortalRoute({ portalId, children }) {
  const { accounts, inProgress } = useMsal();
  const { isLoading, canAccessPortal, getAvailablePortals, selectedPortalId } = useAuth();

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

  if (accounts.length === 0) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (!canAccessPortal(portalId)) {
    const portals = getAvailablePortals();
    if (portals.length === 0) {
      return <Navigate to="/no-portal-access" replace />;
    }

    const selectedPortal = portals.find((portal) => portal.id === selectedPortalId);
    return <Navigate to={(selectedPortal || portals[0]).path} replace />;
  }

  return children;
}
