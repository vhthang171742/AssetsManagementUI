import React, { useState } from "react";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import EntityDetailModal from "./EntityDetailModal";

/**
 * EntityPill - A clickable pill badge that opens a read-only detail modal.
 *
 * @param {"asset"|"class"|"student"} type - The entity type to display
 * @param {string|number} id          - The entity primary ID
 * @param {string} label              - Friendly display label (e.g. AssetCode, ClassCode, FullName)
 * @param {string} [className]        - Optional extra CSS class
 * @param {object} [modalData]        - Optional extra fields for detail modal
 */
export default function EntityPill({ type, id, label, className = "", modalData = null }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!label && !id) return null;

  const displayLabel = label || (
    type === "asset" ? t(K.COMMON_ASSET, "Asset")
    : type === "class" ? t(K.COMMON_CLASS, "Class")
    : t(K.COMMON_STUDENT, "Student")
  );

  const pillColors = {
    asset: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    class: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700",
    student: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
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
