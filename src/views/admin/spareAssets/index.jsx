import React from "react";
import SpareAssetsTable from "./components/SpareAssetsTable";

export default function SpareAssetsPage() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <SpareAssetsTable />
    </div>
  );
}
