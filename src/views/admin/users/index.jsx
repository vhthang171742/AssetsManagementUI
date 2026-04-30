import React from "react";
import UsersTable from "./components/UsersTable";

export default function Users() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5">
      <UsersTable />
    </div>
  );
}


