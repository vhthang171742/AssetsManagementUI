import React from "react";
import Navbar from "components/navbar";

export default function PortalLayout({ title, children }) {
  React.useEffect(() => {
    document.title = title ? `${title} | Assets Management` : "Assets Management";
  }, [title]);

  return (
    <div className="min-h-screen bg-lightPrimary dark:bg-navy-900">
      <header className="w-full border-b border-gray-200 bg-lightPrimary/95 dark:border-white/10 dark:bg-navy-900/95">
        <div className="w-full px-3 py-2 sm:px-4 md:px-8">
          <div className="w-full">
            <Navbar
              showSidebarToggle={false}
              profilePath="/profile"
            />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full px-3 pt-2 sm:px-4 md:px-8">
        <main className="mx-auto mt-2 w-full max-w-6xl pb-10">{children}</main>
      </div>
    </div>
  );
}
