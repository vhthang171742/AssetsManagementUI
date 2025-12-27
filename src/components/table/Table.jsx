import React, { useMemo, useState, useEffect } from "react";

// Shared Table component
// Props:
// - columns: [{ header, accessor, width?, render?: (row) => node }]
// - data: array of objects
// - pageSize: number (optional)
// - height: CSS height string for the scrollable area (optional)
// - onBulkDelete: fn(ids) => Promise (optional)
// - selectable: boolean (default true)
// - idField: string (default "assetID" - the field name for unique id)

export default function Table({
  columns = [],
  data = [],
  pageSize = 10,
  height = "calc(100vh - 240px)",
  onBulkDelete,
  selectable = true,
  idField = "assetID",
}) {
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    // reset selection when data changes
    setSelected(new Set());
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const allSelectedOnPage = pageData.length > 0 && pageData.every((r) => selected.has(r[idField]));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageData.forEach((r) => next.delete(r[idField]));
      } else {
        pageData.forEach((r) => next.add(r[idField]));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected item(s)?`)) return;
    try {
      await onBulkDelete(ids);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      alert("Bulk delete failed: " + (err.message || err));
    }
  };

  return (
    <div className="w-full h-full flex flex-col border rounded shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
      <div style={{ flex: "1 1 auto", height }} className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b dark:border-gray-700">
              {selectable && (
                <th className="p-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAllOnPage} />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="text-left p-3 sticky top-0 bg-white dark:bg-gray-800 dark:text-white z-10"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row[idField] || row.id || Math.random()} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                {selectable && (
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row[idField])}
                      onChange={() => toggleSelect(row[idField])}
                      className="w-full"
                    />
                  </td>
                )}
                {columns.map((col, cidx) => (
                  <td key={cidx} className="p-3 align-top dark:text-white">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 border-t dark:border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBulkDelete && (
            <button
              onClick={handleBulkDelete}
              disabled={selected.size === 0}
              className={`px-3 py-1 rounded text-white ${selected.size === 0 ? 'bg-gray-300 dark:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Delete Selected ({selected.size})
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">Page {page} / {totalPages}</div>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
