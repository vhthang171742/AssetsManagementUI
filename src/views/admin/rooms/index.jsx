import React from "react";
import RoomsTable from "./components/RoomsTable";

export default function Rooms() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <RoomsTable />
    </div>
  );
}
