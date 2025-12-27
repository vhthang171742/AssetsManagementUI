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
  getAll: () => httpClient("/Assets"),

  /**
   * Get a specific asset by ID
   * @param {number} id - Asset ID
   * @returns {Promise<object>} Asset details
   */
  getById: (id) => httpClient(`/Assets/${id}`),

  /**
   * Get asset by asset code
   * @param {string} assetCode - Asset code
   * @returns {Promise<object>} Asset details
   */
  getByCode: (assetCode) => httpClient(`/Assets/by-code/${assetCode}`),

  /**
   * Get all assets in a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} List of assets in category
   */
  getByCategory: (categoryId) =>
    httpClient(`/Assets/by-category/${categoryId}`),

  /**
   * Get all available units
   * @returns {Promise<Array>} List of units
   */
  getUnits: () => httpClient("/Assets/units"),

  /**
   * Create a new asset
   * @param {object} data - Asset data
   * @returns {Promise<object>} Created asset
   */
  create: (data) =>
    httpClient("/Assets", {
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
    httpClient(`/Assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete an asset
   * @param {number} id - Asset ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/Assets/${id}`, {
      method: "DELETE",
    }),

  /**
   * Update asset quantity
   * @param {number} id - Asset ID
   * @param {number} quantityChange - Quantity change (positive or negative)
   * @returns {Promise<object>} Updated asset
   */
  updateQuantity: (id, quantityChange) =>
    httpClient(`/Assets/${id}/quantity`, {
      method: "PATCH",
      body: JSON.stringify({ quantityChange }),
    }),

  /**
   * Delete multiple assets
   * @param {Array<number>} ids - Array of asset IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/Assets/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default assetService;
