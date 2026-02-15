import React from "react";
import UsersTable from "./components/UsersTable";

export default function Users() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5">
      <UsersTable />
    </div>
  );
}
