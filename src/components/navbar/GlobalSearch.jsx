import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import routes from "routes.js";

// Flatten routes into searchable items
function buildSearchIndex() {
  const items = [];
  routes.forEach((route) => {
    if (route.sidebar === false) return; // skip auth routes etc
    if (!route.layout || !route.path) return;
    items.push({
      name: route.name,
      path: `${route.layout}/${route.path}`,
      icon: route.icon,
    });
  });
  return items;
}

const searchIndex = buildSearchIndex();

export default function GlobalSearch({ className = "", inputClassName = "", placeholder = "Search...", autoFocus = false, onClose }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSelect = (item) => {
    setQuery("");
    setOpen(false);
    navigate(item.path);
    if (onClose) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      if (onClose) onClose();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex h-9 items-center rounded-full bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white ${inputClassName}`}>
        <span className="pl-3 pr-2 text-xl">
          <FiSearch className="h-4 w-4 text-gray-400 dark:text-white" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (query) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block h-full w-full rounded-full bg-lightPrimary pr-3 text-sm font-medium text-navy-700 outline-none placeholder:!text-gray-400 dark:bg-navy-900 dark:text-white dark:placeholder:!text-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOpen(false); }}
            className="mr-2 shrink-0 text-gray-400 hover:text-gray-600 dark:text-white"
          >
            <MdClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-xl bg-white py-1 shadow-xl dark:bg-navy-700">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-navy-600"
            >
              <span className="shrink-0 text-gray-500 dark:text-gray-300">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
