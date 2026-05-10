import React from "react";
import EntityPill from "components/EntityPill";
import { getPillConfig } from "hooks/useEntityPillConfig";

/**
 * TableEntityPill - Wrapper component for rendering entity pills in table cells
 *
 * Automatically extracts code/ID from row using entity type configuration
 *
 * @param {string} entityType - The entity type (asset, class, student, etc.)
 * @param {object} row - The table row object
 * @param {string} [className] - Additional CSS classes for the pill
 * @param {object} [modalData] - Optional data to pass to the modal
 *
 * @example
 * // In your table columns definition:
 * const columns = [
 *   {
 *     header: "Asset",
 *     accessor: "assetCode",
 *     render: (row) => <TableEntityPill entityType="asset" row={row} />
 *   },
 *   {
 *     header: "Student",
 *     accessor: "studentCode",
 *     render: (row) => <TableEntityPill entityType="student" row={row} />
 *   }
 * ];
 */
export default function TableEntityPill({ entityType, row, className = "", modalData = null }) {
  if (!row) return null;

  const config = getPillConfig(entityType);
  const code = row[config.codeField];
  const id = row[config.idField];

  // Fallback: if code is missing, use id
  const displayLabel = code || id || "—";

  return (
    <EntityPill
      type={entityType}
      id={id}
      label={displayLabel}
      className={className}
      modalData={modalData}
    />
  );
}
