import React from "react";
import ProductionStepsTable from "./components/ProductionStepsTable";

export default function ProductionSteps() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <ProductionStepsTable />
    </div>
  );
}
