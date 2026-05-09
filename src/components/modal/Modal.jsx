import React from "react";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = "max-w-2xl" }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-lg w-full ${maxWidth} max-h-[90vh] flex flex-col border border-gray-300 dark:border-gray-700 shadow-lg overflow-hidden`}>
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label={t(K.MODAL_CLOSE, "Close")}
            title={t(K.MODAL_CLOSE, "Close")}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 dark:text-white min-h-0">{children}</div>

        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">{footer}</div>
      </div>
    </div>
  );
}
