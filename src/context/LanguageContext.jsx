import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { configurationService } from "services/configurationService";
import { updateMyLanguage } from "services/userService";
import { useAuth } from "context/AuthContext";
import { getFallbackBundle } from "i18n/fallbackTranslations";

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

const UI_TEXT_OVERRIDES = {
  "en-US": {
    PORTAL_MAINTAINER_NAME: "Technician Portal",
    MAINTAINER_PORTAL_TITLE: "Technician Portal",
  },
  "vi-VN": {
    PORTAL_MAINTAINER_NAME: "Cổng kỹ thuật viên",
    MAINTAINER_PORTAL_TITLE: "Cổng kỹ thuật viên",
  },
};

const interpolate = (template, params) => {
  if (!template || !params || typeof params !== "object") {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      return `{${key}}`;
    }
    return String(params[key]);
  });
};

export const LanguageProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE
  );
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [translations, setTranslations] = useState(() =>
    getFallbackBundle(localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE)
  );

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

  // Keep UI language aligned with profile preference when available.
  // Only react to profile changes; do not override a user toggle in-flight.
  useEffect(() => {
    const preferredLanguage = currentUser?.preferredLanguageCode;
    if (!preferredLanguage) {
      return;
    }

    setLanguageState((previousLanguage) => {
      if (previousLanguage === preferredLanguage) {
        return previousLanguage;
      }

      localStorage.setItem(STORAGE_KEY, preferredLanguage);
      return preferredLanguage;
    });
  }, [currentUser?.preferredLanguageCode]);

  // Fetch translated UI labels from configuration items and merge with fallback bundle.
  useEffect(() => {
    let cancelled = false;

    const fetchUiTranslations = async () => {
      const fallbackBundle = getFallbackBundle(language);
      setTranslations(fallbackBundle);

      try {
        const items = await configurationService.getItems("UiText", language);
        if (cancelled || !Array.isArray(items)) {
          return;
        }

        const remoteBundle = items.reduce((acc, item) => {
          if (item?.itemCode && item?.label) {
            acc[item.itemCode] = item.label;
          }
          return acc;
        }, {});

        const overrideBundle = UI_TEXT_OVERRIDES[language] || {};
        setTranslations({
          ...fallbackBundle,
          ...remoteBundle,
          ...overrideBundle,
        });
      } catch (err) {
        console.warn("Failed to load UiText translations from configuration items:", err.message);
      }
    };

    fetchUiTranslations();
    return () => {
      cancelled = true;
    };
  }, [language]);

  /**
   * Change the active language and persist to localStorage
   * @param {string} langCode - e.g. "vi-VN"
   */
  const setLanguage = useCallback(async (langCode) => {
    if (!langCode || langCode === language) {
      return;
    }

    setLanguageState(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);

    if (isAuthenticated) {
      try {
        await updateMyLanguage(langCode);
      } catch (err) {
        console.warn("Failed to persist preferred language to profile:", err.message);
      }
    }
  }, [isAuthenticated, language]);

  /**
   * Resolve a translation key to localized text.
   */
  const t = useCallback((key, fallback = null, params = null) => {
    if (!key) {
      return interpolate(fallback || "", params);
    }

    return interpolate(translations[key] || fallback || key, params);
  }, [translations]);

  const value = {
    /** Current language code, e.g. "en-US" */
    language,
    /** Update language */
    setLanguage,
    /** Array of { languageID, languageCode, languageName, isActive } */
    languages,
    /** Whether the language list is still loading */
    loadingLanguages,
    /** Translation lookup function */
    t,
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
