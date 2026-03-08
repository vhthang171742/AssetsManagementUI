import React from "react";
import { Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { MdLockOutline, MdLogout } from "react-icons/md";
import { useAuth } from "context/AuthContext";

export default function NoPortalAccessPage() {
  const { instance } = useMsal();
  const { isLoading, getAvailablePortals, selectedPortalId } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-navy-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
      </div>
    );
  }

  const portals = getAvailablePortals();
  if (portals.length > 0) {
    const selectedPortal = portals.find((portal) => portal.id === selectedPortalId);
    return <Navigate to={(selectedPortal || portals[0]).path} replace />;
  }

  const handleSignOut = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-lightPrimary dark:bg-navy-900">
      <div className="mx-4 max-w-lg rounded-xl bg-white p-8 shadow-xl dark:bg-navy-800">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <MdLockOutline className="h-10 w-10 text-amber-600 dark:text-amber-300" />
          </div>

          <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
            Portal Access Required
          </h1>

          <p className="text-gray-600 dark:text-gray-300">
            Your account is active, but no portal access has been assigned yet.
          </p>

          <p className="text-gray-600 dark:text-gray-300">
            Please contact your administrator to grant access to Student, Teacher, Maintainer, or Admin portal.
          </p>

          <button
            onClick={handleSignOut}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 font-medium text-white hover:bg-red-600"
          >
            <MdLogout className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
