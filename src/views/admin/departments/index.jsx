import React from "react";
import DepartmentsTable from "./components/DepartmentsTable";

export default function Departments() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <DepartmentsTable />
    </div>
  );
}
