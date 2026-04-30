import React from "react";
import CategoriesTable from "./components/CategoriesTable";

export default function Categories() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <CategoriesTable />
    </div>
  );
}


