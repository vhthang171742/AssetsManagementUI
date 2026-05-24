import React from "react";
import ProductionOrdersTable from "./components/ProductionOrdersTable";

export default function ProductionOrders() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <ProductionOrdersTable />
    </div>
  );
}
