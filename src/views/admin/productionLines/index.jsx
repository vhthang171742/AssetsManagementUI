import React from "react";
import ProductionLinesTable from "./components/ProductionLinesTable";

export default function ProductionLines() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <ProductionLinesTable />
    </div>
  );
}
