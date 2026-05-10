/**
 * Asset Service
 * Handles all asset-related API calls
 */
import { httpClient } from "./httpClient";

export const assetService = {
  /**
   * Get all assets
   * @returns {Promise<Array>} List of assets
   */
  getAll: () => httpClient("/assets"),

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.categoryID != null && query.categoryID !== "") params.set("categoryID", String(query.categoryID));

    const queryString = params.toString();
    return httpClient(`/assets/paged${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Get a specific asset by ID
   * @param {number} id - Asset ID
   * @returns {Promise<object>} Asset details
   */
  getById: (id) => httpClient(`/assets/${id}`),

  /**
   * Get asset by asset code
   * @param {string} assetCode - Asset code
   * @returns {Promise<object>} Asset details
   */
  getByCode: (assetCode) => httpClient(`/assets/by-code/${assetCode}`),

  /**
   * Get all assets in a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} List of assets in category
   */
  getByCategory: (categoryId) =>
    httpClient(`/assets/by-category/${categoryId}`),

  /**
   * Get available room assets for training assignment
   * @returns {Promise<Array>} List of available room assets
   */
  getAvailableForTraining: () => httpClient("/assets/available-for-training"),

  /**
   * Get all available units
   * @returns {Promise<Array>} List of units
   */
  getUnits: () => httpClient("/assets/units"),

  /**
   * Create a new asset
   * @param {object} data - Asset data
   * @returns {Promise<object>} Created asset
   */
  create: (data) =>
    httpClient("/assets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing asset
   * @param {number} id - Asset ID
   * @param {object} data - Updated asset data
   * @returns {Promise<object>} Updated asset
   */
  update: (id, data) =>
    httpClient(`/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete an asset
   * @param {number} id - Asset ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/assets/${id}`, {
      method: "DELETE",
    }),

  /**
   * Delete multiple assets
   * @param {Array<number>} ids - Array of asset IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/assets/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default assetService;
