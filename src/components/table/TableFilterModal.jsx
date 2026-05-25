import React, { useState } from "react";
import { MdFilterAlt, MdClose } from "react-icons/md";
import TableFilterBar from "./TableFilterBar";

/**
 * TableFilterModal — renders a "Filters" button (with active-count badge) that opens
 * a modal overlay containing the TableFilterBar.
 *
 * Props:
 *   filterableColumns: [{ key, label, options: [{value, label}] }]
 *   activeFilters:     { [key]: string[] }
 *   onFilterApply:     (filters) => void
 */
export default function TableFilterModal({ filterableColumns = [], activeFilters = {}, onFilterApply }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!filterableColumns?.length || !onFilterApply) return null;

  const activeCount = Object.values(activeFilters).filter((v) => v?.length > 0).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex shrink-0 items-center gap-1.5 rounded border border-gray-300 px-3 py-2 text-sm text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
      >
        <MdFilterAlt className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-navy-800">
            <div className="flex items-center justify-between border-b px-5 py-3 dark:border-gray-700">
              <h2 className="font-semibold text-navy-700 dark:text-white">Filters</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <MdClose className="h-5 w-5 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
            <div className="p-5">
              <TableFilterBar
                filterableColumns={filterableColumns}
                activeFilters={activeFilters}
                onFilterApply={onFilterApply}
                className="flex flex-wrap items-center gap-2"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
