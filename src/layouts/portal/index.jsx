import React from "react";
import Navbar from "components/navbar";

export default function PortalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-lightPrimary dark:bg-navy-900">
      <div className="mx-auto w-full px-4 pt-4 md:px-8">
        <Navbar
          brandText={title}
          showSidebarToggle={false}
          profilePath="/profile"
        />
        <main className="mx-auto mt-6 w-full max-w-6xl pb-10">{children}</main>
      </div>
    </div>
  );
}
