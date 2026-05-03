import React, { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

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
  actions = [],
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  height = "100%",
  onBulkDelete,
  selectable = true,
  idField = "assetID",
  serverPagination = false,
  page: controlledPage,
  totalItems,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortDirection = "asc",
  onSortChange,
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    setCurrentPageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    // reset selection when data changes
    setSelected(new Set());
    if (!serverPagination) {
      setPage(1);
    }
  }, [data]);

  const effectivePage = serverPagination ? (controlledPage ?? 1) : page;
  const effectiveTotalItems = serverPagination ? (totalItems ?? data.length) : data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotalItems / currentPageSize));

  const pageData = useMemo(() => {
    if (serverPagination) {
      return data;
    }
    const start = (page - 1) * currentPageSize;
    return data.slice(start, start + currentPageSize);
  }, [data, page, currentPageSize, serverPagination]);

  const getRowId = (row) =>
    row?.[idField] ??
    row?.id ??
    row?.assetID ??
    row?.courseID ??
    row?.classID ??
    row?.assignmentID ??
    row?.mappingID;

  const getCellValue = (row, col) => {
    if (typeof col.accessor === "function") {
      return col.accessor(row);
    }
    if (typeof col.accessor === "string") {
      return row?.[col.accessor];
    }
    return "";
  };

  const allSelectedOnPage = pageData.length > 0 && pageData.every((r) => selected.has(getRowId(r)));

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
        pageData.forEach((r) => next.delete(getRowId(r)));
      } else {
        pageData.forEach((r) => next.add(getRowId(r)));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(t(K.TABLE_CONFIRM_DELETE_SELECTED, "Delete selected items?"))) return;
    try {
      await onBulkDelete(ids);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error(`${t(K.TABLE_BULK_DELETE_FAILED, "Bulk delete failed")}: ${err.message || err}`);
    }
  };

  const getSortKey = (col) => {
    if (col.sortKey) return col.sortKey;
    if (typeof col.accessor === "string") return col.accessor;
    return null;
  };

  const handleSort = (col) => {
    if (!onSortChange) return;
    const key = getSortKey(col);
    if (!key) return;

    const isCurrent = sortBy === key;
    const nextDirection = isCurrent && String(sortDirection).toLowerCase() === "asc" ? "desc" : "asc";
    onSortChange(key, nextDirection);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div style={{ height }} className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b dark:border-gray-700">
              {selectable && (
                <th className="p-2 sticky top-0 bg-white dark:bg-gray-800 z-10 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                  <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAllOnPage} />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`text-left p-3 sticky top-0 bg-white dark:bg-gray-800 dark:text-white z-10 ${onSortChange && getSortKey(col) ? "cursor-pointer select-none" : ""}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {onSortChange && getSortKey(col) && (
                      <span className="text-xs opacity-70">
                        {sortBy === getSortKey(col)
                          ? (String(sortDirection).toLowerCase() === "desc" ? "▼" : "▲")
                          : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="text-left p-3 sticky top-0 bg-white dark:bg-gray-800 dark:text-white z-10" style={{ width: "140px" }}>
                  {t(K.TABLE_ACTIONS, "Actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, rowIndex) => {
              const rowId = getRowId(row) ?? `${effectivePage}-${rowIndex}`;
              return (
              <tr key={rowId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                {selectable && (
                  <td className="p-2 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(rowId)}
                      onChange={() => toggleSelect(rowId)}
                    />
                  </td>
                )}
                {columns.map((col, cidx) => (
                  <td key={cidx} className="p-3 align-top dark:text-white">
                    {col.render ? col.render(row) : getCellValue(row, col)}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="p-3 align-top dark:text-white">
                    <div className="flex flex-wrap items-center gap-2">
                      {actions.map((action, aidx) => (
                        (() => {
                          const isDisabled =
                            typeof action.isDisabled === "function"
                              ? Boolean(action.isDisabled(row))
                              : Boolean(action.isDisabled);

                          return (
                            <button
                              key={aidx}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                if (!isDisabled && action.onClick) {
                                  action.onClick(row, rowId);
                                }
                              }}
                              title={action.label}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                                action.variant === "danger"
                                  ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                  : action.variant === "warning"
                                    ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                    : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              } ${isDisabled ? "cursor-not-allowed opacity-40 hover:bg-transparent dark:hover:bg-transparent" : ""}`}
                            >
                              {action.icon}
                            </button>
                          );
                        })()
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            )})}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {t(K.TABLE_NO_DATA, "No data")}
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
              {t(K.TABLE_DELETE_SELECTED, "Delete Selected")} ({selected.size})
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {t(K.TABLE_ROWS, "Rows")}
            <select
              value={currentPageSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setCurrentPageSize(nextSize);
                if (serverPagination) {
                  if (onPageSizeChange) onPageSizeChange(nextSize);
                  if (onPageChange) onPageChange(1);
                } else {
                  setPage(1);
                }
              }}
              className="rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t(K.TABLE_PAGE, "Page")} {effectivePage} / {totalPages}</div>
          <button
            onClick={() => {
              if (serverPagination) {
                if (onPageChange) onPageChange(Math.max(1, effectivePage - 1));
              } else {
                setPage((p) => Math.max(1, p - 1));
              }
            }}
            disabled={effectivePage <= 1}
            className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            {t(K.TABLE_PREV, "Prev")}
          </button>
          <button
            onClick={() => {
              if (serverPagination) {
                if (onPageChange) onPageChange(Math.min(totalPages, effectivePage + 1));
              } else {
                setPage((p) => Math.min(totalPages, p + 1));
              }
            }}
            disabled={effectivePage >= totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            {t(K.TABLE_NEXT, "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
