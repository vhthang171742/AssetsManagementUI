import React from "react";
import MaintenanceRecordsTable from "./components/MaintenanceRecordsTable";

export default function MaintenanceRecordsPage() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <MaintenanceRecordsTable />
    </div>
  );
}
