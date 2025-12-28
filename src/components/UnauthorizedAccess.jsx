import React from "react";
import { useMsal } from "@azure/msal-react";
import { MdLock, MdLogout } from "react-icons/md";
import { useAuth } from "context/AuthContext";

/**
 * UnauthorizedAccess Component
 * Displays when a user is authenticated but doesn't have the required roles
 */
export default function UnauthorizedAccess() {
  const { instance } = useMsal();
  const { user, userRoles } = useAuth();

  // Get required roles from environment (with fallback)
  const requiredRolesEnv = process.env.REACT_APP_REQUIRED_ROLES || process.env.REACT_APP_API_SCOPES || "Asset.Reader,Asset.Manager";
  const requiredRoles = requiredRolesEnv.split(",").map((r) => r.trim()).filter(Boolean);

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-lightPrimary dark:bg-navy-900">
      <div className="mx-4 max-w-md rounded-xl bg-white p-8 shadow-xl dark:bg-navy-800">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Lock Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <MdLock className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
            Access Denied
          </h1>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              You are signed in as <strong>{user?.email}</strong>, but you don't have the required permissions to access this application.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Please contact your administrator to assign you one of the following app roles in Azure AD:
            </p>
            <ul className="mt-2 list-inside list-disc text-left text-sm text-gray-600 dark:text-gray-400">
              {requiredRoles.map((role, index) => (
                <li key={index}>{role}</li>
              ))}
            </ul>
          </div>

          {/* Current Roles (for debugging) */}
          {userRoles && userRoles.length > 0 && (
            <div className="w-full rounded-lg bg-gray-50 p-3 dark:bg-navy-900 text-left">
              <p className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                Your current roles:
              </p>
              <div className="max-h-32 overflow-y-auto">
                {userRoles.map((role, index) => (
                  <p key={index} className="text-xs text-gray-500 dark:text-gray-500">
                    • {role}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            <MdLogout className="h-5 w-5" />
            Sign Out
          </button>

          {/* Help Text */}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            After receiving access, please sign out and sign in again.
          </p>
        </div>
      </div>
    </div>
  );
}
