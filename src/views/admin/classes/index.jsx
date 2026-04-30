import React from "react";
import ClassesTable from "./components/ClassesTable";

export default function Classes() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <ClassesTable />
    </div>
  );
}


