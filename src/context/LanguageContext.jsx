import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { configurationService } from "services/configurationService";

/**
 * LanguageContext
 *
 * Manages the user's selected locale (e.g. "en-US", "vi-VN").
 * - Persists the choice in localStorage
 * - Fetches available languages from the backend on mount
 * - Exposes the current language for the httpClient Accept-Language header
 *   and for dropdown service calls
 */
const LanguageContext = createContext(null);

const STORAGE_KEY = "app_language";
const DEFAULT_LANGUAGE = "en-US";

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE
  );
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  // Fetch available languages from the configuration endpoint
  useEffect(() => {
    let cancelled = false;
    const fetchLanguages = async () => {
      try {
        const data = await configurationService.getLanguages();
        if (!cancelled) {
          setLanguages(data || []);
        }
      } catch (err) {
        console.warn("Failed to fetch languages:", err.message);
        // Provide fallback languages so the switcher still works
        if (!cancelled) {
          setLanguages([
            { languageID: 1, languageCode: "en-US", languageName: "English (US)", isActive: true },
            { languageID: 2, languageCode: "vi-VN", languageName: "Tiếng Việt", isActive: true },
          ]);
        }
      } finally {
        if (!cancelled) setLoadingLanguages(false);
      }
    };
    fetchLanguages();
    return () => { cancelled = true; };
  }, []);

  /**
   * Change the active language and persist to localStorage
   * @param {string} langCode - e.g. "vi-VN"
   */
  const setLanguage = useCallback((langCode) => {
    setLanguageState(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);
  }, []);

  const value = {
    /** Current language code, e.g. "en-US" */
    language,
    /** Update language */
    setLanguage,
    /** Array of { languageID, languageCode, languageName, isActive } */
    languages,
    /** Whether the language list is still loading */
    loadingLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to access the current language and available languages
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;
