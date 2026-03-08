import React from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";

export default function MaintainerPortal() {
  return (
    <PortalLayout title="Maintainer Portal">
      <p className="text-base text-gray-600 dark:text-gray-300">
        Handle maintenance workload, preventive schedules and repair execution.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Maintenance Queue</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Track open jobs, severity and assigned assets.
          </p>
        </Card>
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Service History</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Review completed maintenance records and recurring issues.
          </p>
        </Card>
        <Card extra="p-5">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Spare Parts</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Monitor part usage, replacements and stock requirements.
          </p>
        </Card>
      </div>
    </PortalLayout>
  );
}
