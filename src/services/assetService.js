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
   * Get all assets for status management (maintainer/admin)
   * @returns {Promise<Array>} List of assets with all statuses
   */
  getAllStatuses: () => httpClient("/assets/all-statuses"),

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
   * Update asset quantity
   * @param {number} id - Asset ID
   * @param {number} quantityChange - Quantity change (positive or negative)
   * @returns {Promise<object>} Updated asset
   */
  updateQuantity: (id, quantityChange) =>
    httpClient(`/assets/${id}/quantity`, {
      method: "PATCH",
      body: JSON.stringify({ quantityChange }),
    }),

  /**
   * Update asset operational status
   * @param {number} id - Asset ID
   * @param {string} statusCode - Equipment status code
   * @returns {Promise<object>} Updated asset
   */
  updateStatus: (id, statusCode) =>
    httpClient(`/assets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ statusCode }),
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
