import React from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";

export default function TeacherPortal() {
  return (
    <PortalLayout title="Teacher Portal">
      <p className="text-base text-gray-600 dark:text-gray-300">
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
    </PortalLayout>
  );
}
