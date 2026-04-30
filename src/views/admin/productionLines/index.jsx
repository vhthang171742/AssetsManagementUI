import React from "react";
import ProductionLinesTable from "./components/ProductionLinesTable";

export default function ProductionLines() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <ProductionLinesTable />
    </div>
  );
}


