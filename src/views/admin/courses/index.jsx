import React from "react";
import CoursesTable from "./components/CoursesTable";

export default function Courses() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <CoursesTable />
    </div>
  );
}


