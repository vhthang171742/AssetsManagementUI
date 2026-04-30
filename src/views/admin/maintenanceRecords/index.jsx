import React from "react";
import MaintenanceRecordsTable from "./components/MaintenanceRecordsTable";

export default function MaintenanceRecordsPage() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <MaintenanceRecordsTable />
    </div>
  );
}


