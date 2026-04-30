import React from "react";
import DepartmentsTable from "./components/DepartmentsTable";

export default function Departments() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <DepartmentsTable />
    </div>
  );
}


