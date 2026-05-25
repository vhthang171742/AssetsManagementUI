import React, { useState, useRef, useEffect } from "react";
import { MdClose, MdExpandMore } from "react-icons/md";

// Dropdown with checkboxes for multi-value selection
function ValueMultiSelect({ options, selected, onToggle, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabels = selected.map(
    (v) => options.find((o) => String(o.value) === String(v))?.label ?? String(v),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[140px] items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <span className="flex-1 truncate text-left text-gray-600 dark:text-gray-300">
          {selected.length === 0 ? placeholder : selectedLabels.join(", ")}
        </span>
        <MdExpandMore className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-[180px] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No options</div>
          ) : (
            options.map((opt) => (
              <label
                key={String(opt.value)}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(String(opt.value))}
                  onChange={() => onToggle(String(opt.value))}
                  className="accent-brand-500"
                />
                <span className="dark:text-white">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * TableFilterBar
 *
 * Props:
 *   filterableColumns: [{ key: string, label: string, options: [{value, label}][] }]
 *   activeFilters:     { [key]: string[] }   — currently applied filters
 *   onFilterApply:     (filters: { [key]: string[] }) => void
 */
export default function TableFilterBar({ filterableColumns = [], activeFilters = {}, onFilterApply, className }) {
  const [selectedField, setSelectedField] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);

  const currentField = filterableColumns.find((f) => f.key === selectedField);

  const handleFieldChange = (key) => {
    setSelectedField(key);
    setSelectedValues(key ? (activeFilters[key] ?? []).map(String) : []);
  };

  const toggleValue = (v) => {
    setSelectedValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleApply = () => {
    if (!selectedField) return;
    const newFilters = { ...activeFilters };
    if (selectedValues.length > 0) {
      newFilters[selectedField] = selectedValues;
    } else {
      delete newFilters[selectedField];
    }
    onFilterApply(newFilters);
    setSelectedField("");
    setSelectedValues([]);
  };

  const removeFilter = (key) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    onFilterApply(newFilters);
    if (selectedField === key) {
      setSelectedField("");
      setSelectedValues([]);
    }
  };

  const activeEntries = Object.entries(activeFilters).filter(([, v]) => v?.length > 0);

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2 border-b px-3 py-2 dark:border-gray-700"}>
      {/* Field selector */}
      <select
        value={selectedField}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <option value="">Filter by…</option>
        {filterableColumns.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Values multiselect — only when a field is selected */}
      {selectedField && currentField && (
        <ValueMultiSelect
          options={currentField.options ?? []}
          selected={selectedValues}
          onToggle={toggleValue}
          placeholder="Select values…"
        />
      )}

      {/* Apply */}
      <button
        type="button"
        onClick={handleApply}
        disabled={!selectedField}
        className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
          selectedField
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
        }`}
      >
        Apply
      </button>

      {/* Active filter chips */}
      {activeEntries.map(([key, values]) => {
        const field = filterableColumns.find((f) => f.key === key);
        const labels = values.map(
          (v) => field?.options?.find((o) => String(o.value) === String(v))?.label ?? String(v),
        );
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          >
            <span className="font-medium">{field?.label ?? key}:</span>
            <span>{labels.join(", ")}</span>
            <button
              type="button"
              onClick={() => removeFilter(key)}
              className="ml-0.5 rounded-full opacity-70 hover:opacity-100"
            >
              <MdClose className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {/* Clear all */}
      {activeEntries.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onFilterApply({});
            setSelectedField("");
            setSelectedValues([]);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
