import React from "react";
import CoursesTable from "./components/CoursesTable";

export default function Courses() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <CoursesTable />
    </div>
  );
}
