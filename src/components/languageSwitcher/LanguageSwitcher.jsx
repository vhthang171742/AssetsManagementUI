import React from "react";
import { useLanguage } from "context/LanguageContext";
import { MdLanguage } from "react-icons/md";

/**
 * LanguageSwitcher — Compact dropdown for switching the active locale.
 * Place in the navbar or settings area.
 *
 * Reads and writes via LanguageContext.
 */
const LanguageSwitcher = ({ className = "" }) => {
  const { language, setLanguage, languages, loadingLanguages } = useLanguage();

  if (loadingLanguages) {
    return null; // Don't render until languages are loaded
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <MdLanguage className="absolute left-2 h-4 w-4 text-gray-500 dark:text-gray-300 pointer-events-none" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none pl-7 pr-6 py-1 text-sm rounded-lg bg-lightPrimary dark:bg-navy-900 text-navy-700 dark:text-white border-none outline-none cursor-pointer"
        aria-label="Select language"
      >
        {languages
          .filter((l) => l.isActive)
          .map((l) => (
            <option key={l.languageCode} value={l.languageCode}>
              {l.languageCode === "en-US" ? "EN" : l.languageCode === "vi-VN" ? "VI" : l.languageCode}
            </option>
          ))}
      </select>
      <svg
        className="absolute right-1 h-3 w-3 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
};

export default LanguageSwitcher;
