import React from "react";
import MaintenanceSchedulesTable from "./components/MaintenanceSchedulesTable";

export default function MaintenanceSchedulesPage() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <MaintenanceSchedulesTable />
    </div>
  );
}
