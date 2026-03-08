import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import Card from "components/card";

export default function PortalSelection() {
  const navigate = useNavigate();
  const { isLoading, getAvailablePortals, isAuthenticated, setSelectedPortal } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-lightPrimary dark:bg-navy-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  const portals = getAvailablePortals();

  if (portals.length === 0) {
    return <Navigate to="/admin" replace />;
  }

  if (portals.length === 1) {
    return <Navigate to={portals[0].path} replace />;
  }

  const handleEnterPortal = (portal) => {
    setSelectedPortal(portal.id);
    navigate(portal.path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-lightPrimary px-4 py-10 dark:bg-navy-900 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-navy-700 dark:text-white">Choose your portal</h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
          Select where you want to work based on your assigned permissions.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {portals.map((portal) => (
            <Card key={portal.id} extra="p-6">
              <div className="flex h-full flex-col">
                <h2 className="text-xl font-bold text-navy-700 dark:text-white">{portal.name}</h2>
                <p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-300">{portal.description}</p>
                <button
                  type="button"
                  onClick={() => handleEnterPortal(portal)}
                  className="mt-6 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Enter portal
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
