/**
 * Dropdown Service
 * Fetches database-driven dropdown options with i18n support.
 * These endpoints are public (no auth required) and return translated labels.
 *
 * Response shape: BaseResponse<ConfigurationItemDto[]>
 * Each item: { itemID, itemCode, label, description, sortOrder, isActive, categoryID }
 *
 * Usage:
 *   const units = await dropdownService.getAssetUnits("vi-VN");
 *   // => [{ itemID: 1, itemCode: "PCS", label: "Cái", ... }, ...]
 */
import { httpClient } from "./httpClient";

/**
 * Build query string with optional language parameter
 * @param {string|null} language - Language code (e.g., "en-US", "vi-VN")
 * @returns {string} Query string portion
 */
const langQuery = (language) => (language ? `?language=${language}` : "");

export const dropdownService = {
  /**
   * Get asset unit dropdown options (PCS, KG, M, SET, etc.)
   * @param {string|null} language - Optional language code
   * @returns {Promise<Array<{itemID: number, itemCode: string, label: string, sortOrder: number, isActive: boolean, categoryID: number}>>}
   */
  getAssetUnits: (language = null) =>
    httpClient(`/dropdown/asset-units${langQuery(language)}`),

  /**
   * Get equipment status dropdown options (OPERATIONAL, MAINTENANCE, BROKEN, etc.)
   * @param {string|null} language - Optional language code
   * @returns {Promise<Array>} List of equipment status items
   */
  getEquipmentStatus: (language = null) =>
    httpClient(`/dropdown/equipment-status${langQuery(language)}`),

  /**
   * Get machine type dropdown options (ONE_NEEDLE, TWO_NEEDLE, OVERLOCK, etc.)
   * @param {string|null} language - Optional language code
   * @returns {Promise<Array>} List of machine type items
   */
  getMachineTypes: (language = null) =>
    httpClient(`/dropdown/machine-types${langQuery(language)}`),

  /**
   * Get asset condition dropdown options (NEW, GOOD, FAIR, POOR, DAMAGED)
   * @param {string|null} language - Optional language code
   * @returns {Promise<Array>} List of asset condition items
   */
  getAssetConditions: (language = null) =>
    httpClient(`/dropdown/AssetCondition${langQuery(language)}`),

  /**
   * Get dropdown options for any configuration category by its code
   * @param {string} categoryCode - Category code (e.g., "AssetUnit", "AssetCondition")
   * @param {string|null} language - Optional language code
   * @returns {Promise<Array>} List of configuration items
   */
  getByCategory: (categoryCode, language = null) =>
    httpClient(`/dropdown/${categoryCode}${langQuery(language)}`),
};

export default dropdownService;
