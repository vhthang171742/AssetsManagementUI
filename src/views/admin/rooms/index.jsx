import React from "react";
import RoomsTable from "./components/RoomsTable";

export default function Rooms() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <RoomsTable />
    </div>
  );
}


