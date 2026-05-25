import React from "react";
import AllAssetItemsTable from "./components/AllAssetItemsTable";

export default function AllAssetItems() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <AllAssetItemsTable />
    </div>
  );
}
