import React, { useState } from "react";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import EntityDetailModal from "./EntityDetailModal";

/**
 * EntityPill - A clickable pill badge that opens a read-only detail modal.
 *
 * Supports multiple entity types: asset, class, student, user, instructor, technician,
 * worker, department, course, room, productionLine, and others.
 *
 * @param {string} type - The entity type to display
 * @param {string|number} id          - The entity primary ID
 * @param {string} label              - Friendly display label (e.g. AssetCode, ClassCode, FullName)
 * @param {string} [className]        - Optional extra CSS class
 * @param {object} [modalData]        - Optional extra fields for detail modal
 */
export default function EntityPill({ type, id, label, className = "", modalData = null }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!label && !id) return null;

  const typeLabels = {
    asset: "Asset",
    class: "Class",
    student: "Student",
    user: "User",
    instructor: "Instructor",
    technician: "Technician",
    worker: "Worker",
    department: "Department",
    course: "Course",
    room: "Room",
    productionLine: "Production Line",
  };

  const displayLabel = label || t(K[`COMMON_${type?.toUpperCase()}`] || "", typeLabels[type] || type);

  const pillColors = {
    asset: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    class: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700",
    student: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
    user: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700",
    instructor: "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700",
    technician: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700",
    worker: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700",
    department: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
    course: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
    room: "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
    productionLine: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t(K.PILL_VIEW_DETAILS, "View details")}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${pillColors[type] || pillColors.asset} ${className}`}
      >
        {displayLabel}
      </button>

      {open && (
        <EntityDetailModal
          type={type}
          id={id}
          modalData={modalData}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
