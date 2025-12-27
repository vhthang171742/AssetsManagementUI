import React from "react";
import CategoriesTable from "./components/CategoriesTable";

export default function Categories() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <CategoriesTable />
    </div>
  );
}
