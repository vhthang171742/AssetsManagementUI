import React from "react";
import { useAuth } from "context/AuthContext";
import UnauthorizedAccess from "components/UnauthorizedAccess";

export default function PageGuard({ requiredRoles, children }) {
  const { isLoading, userRoles } = useAuth();

  if (isLoading || userRoles === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    return children;
  }

  const normalizedRequired = requiredRoles.map((role) => role.toLowerCase());
  const hasRole = (userRoles || []).some((userRole) =>
    normalizedRequired.includes((userRole || "").toLowerCase())
  );

  if (!hasRole) {
    return <UnauthorizedAccess />;
  }

  return children;
}
