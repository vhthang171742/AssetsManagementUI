import React from "react";
import AssetCourseMappingsTable from "./components/AssetCourseMappingsTable";

export default function AssetCourseMappingsPage() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <AssetCourseMappingsTable />
    </div>
  );
}
