/**
 * Configuration Service
 * Admin-only endpoints for managing system configuration categories,
 * items, and translations. Requires "RequireSystemAdmin" policy on the BE.
 *
 * For read-only dropdown population, use dropdownService instead.
 */
import { httpClient } from "./httpClient";

/**
 * Build query string with optional language parameter
 */
const langQuery = (language) => (language ? `?language=${language}` : "");

export const configurationService = {
  // ── Read (public) ──────────────────────────────────────────────

  /**
   * List all configuration categories
   * @returns {Promise<Array<{categoryID, categoryCode, categoryName, description, itemCount, isSystemDefined, sortOrder}>>}
   */
  getCategories: () => httpClient("/configuration/categories"),

  /**
   * Get configuration items for a category
   * @param {string} categoryCode
   * @param {string|null} language
   */
  getItems: (categoryCode, language = null) =>
    httpClient(`/configuration/items/${categoryCode}${langQuery(language)}`),

  /**
   * Get a single configuration item by category + item code
   * @param {string} categoryCode
   * @param {string} itemCode
   * @param {string|null} language
   */
  getItem: (categoryCode, itemCode, language = null) =>
    httpClient(
      `/configuration/items/${categoryCode}/${itemCode}${langQuery(language)}`
    ),

  /**
   * Get all available languages
   * @returns {Promise<Array<{languageID, languageCode, languageName, isActive}>>}
   */
  getLanguages: () => httpClient("/configuration/languages"),

  /**
   * Get the current language detected from the request's Accept-Language header
   * @returns {Promise<string>} e.g. "en-US"
   */
  getCurrentLanguage: () => httpClient("/configuration/current-language"),

  // ── Write (Admin only) ─────────────────────────────────────────

  /**
   * Create a new configuration category
   * @param {{ categoryCode: string, categoryName: string, description?: string }} data
   */
  createCategory: (data) =>
    httpClient("/configuration/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Create a new configuration item with translations
   * @param {{ categoryID: number, itemCode: string, translations: Record<string,string> }} data
   * e.g. { categoryID: 1, itemCode: "PAIR", translations: { "en-US": "Pair", "vi-VN": "Đôi" } }
   */
  createItem: (data) =>
    httpClient("/configuration/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update translations for an existing item
   * @param {number} itemId
   * @param {{ translations: Record<string,string> }} data
   */
  updateItemTranslations: (itemId, data) =>
    httpClient(`/configuration/items/${itemId}/translations`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a configuration item
   * @param {number} itemId
   */
  deleteItem: (itemId) =>
    httpClient(`/configuration/items/${itemId}`, {
      method: "DELETE",
    }),
};

export default configurationService;
