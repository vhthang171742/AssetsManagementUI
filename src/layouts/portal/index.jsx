import React from "react";
import Navbar from "components/navbar";

export default function PortalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-lightPrimary dark:bg-navy-900">
      <header className="w-full border-b border-gray-200 bg-lightPrimary/95 px-6 py-2 dark:border-white/10 dark:bg-navy-900/95">
        <h1 className="truncate text-[26px] font-bold capitalize leading-none text-navy-700 dark:text-white lg:text-[30px]">
          {title}
        </h1>
      </header>
      <div className="mx-auto w-full px-4 pt-2 md:px-8">
        <Navbar
          showSidebarToggle={false}
          profilePath="/profile"
        />
        <main className="mx-auto mt-4 w-full max-w-6xl pb-10">{children}</main>
      </div>
    </div>
  );
}
