import React from "react";
import MaintenanceSchedulesTable from "./components/MaintenanceSchedulesTable";

export default function MaintenanceSchedulesPage() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <MaintenanceSchedulesTable />
    </div>
  );
}


