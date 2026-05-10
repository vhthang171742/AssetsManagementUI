import React from "react";
import EntityPill from "components/EntityPill";

export function findById(items, id, idField) {
  if (!Array.isArray(items) || id == null || id === "") {
    return null;
  }

  return items.find((item) => Number(item?.[idField]) === Number(id)) || null;
}

export function renderPillFallback(text = "-") {
  return <span className="text-gray-400">{text}</span>;
}

export function renderEntityPill({ type, id, label, fallbackLabel = "-", modalData = null, className = "" }) {
  if (id == null || id === "") {
    return renderPillFallback(fallbackLabel);
  }

  return (
    <EntityPill
      type={type}
      id={id}
      label={label || String(id)}
      modalData={modalData}
      className={className}
    />
  );
}

export function renderLookupEntityPill({
  type,
  id,
  items,
  idField,
  labelResolver,
  fallbackLabel = "-",
  modalData = null,
  className = "",
}) {
  if (id == null || id === "") {
    return renderPillFallback(fallbackLabel);
  }

  const item = findById(items, id, idField);
  const label = typeof labelResolver === "function" ? labelResolver(item) : null;

  return (
    <EntityPill
      type={type}
      id={id}
      label={label || String(id)}
      modalData={modalData}
      className={className}
    />
  );
}
