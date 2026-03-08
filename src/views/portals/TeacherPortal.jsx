import React from "react";
import { Link } from "react-router-dom";
import Card from "components/card";
import { useAuth } from "context/AuthContext";

export default function TeacherPortal() {
  const { getAvailablePortals } = useAuth();
  const canSwitchPortal = getAvailablePortals().length > 1;

  return (
    <div className="min-h-screen bg-lightPrimary px-4 py-10 dark:bg-navy-900 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-navy-700 dark:text-white">Teacher Portal</h1>
          {canSwitchPortal ? (
            <Link className="text-sm font-medium text-brand-500" to="/portals">
              Switch portal
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
          Coordinate classes, student usage and training equipment readiness.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Card extra="p-5">
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">Training Dashboard</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Monitor active classes, attendance and asset allocation status.
            </p>
          </Card>
          <Card extra="p-5">
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">Student Asset Activity</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Review student check-in/check-out and usage patterns.
            </p>
          </Card>
          <Card extra="p-5">
            <h2 className="text-lg font-bold text-navy-700 dark:text-white">Class Calendar</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Manage class schedules and equipment requirements by session.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
