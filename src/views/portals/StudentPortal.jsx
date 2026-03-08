import React from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";

export default function StudentPortal() {
  return (
    <PortalLayout title="Student Portal">
      <p className="text-base text-gray-600 dark:text-gray-300">
        Manage your assigned assets and monitor training activities.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Assigned Assets</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            View all assigned assets and perform check-in/check-out actions.
          </p>
        </Card>
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Usage History</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Review your asset usage timeline and handover history.
          </p>
        </Card>
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Training Calendar</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Track upcoming classes, sessions and required equipment.
          </p>
        </Card>
      </div>
    </PortalLayout>
  );
}
