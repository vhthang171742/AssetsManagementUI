/**
 * Asset Category Service
 * Handles all asset category-related API calls
 */
import { httpClient } from "./httpClient";

export const assetCategoryService = {
  /**
   * Get all asset categories
   * @returns {Promise<Array>} List of categories
   */
  getAll: () => httpClient("/asset-categories"),

  /**
   * Get a specific asset category by ID
   * @param {number} id - Category ID
   * @returns {Promise<object>} Category details
   */
  getById: (id) => httpClient(`/asset-categories/${id}`),

  /**
   * Create a new asset category
   * @param {object} data - Category data {categoryName, description}
   * @returns {Promise<object>} Created category
   */
  create: (data) =>
    httpClient("/asset-categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing asset category
   * @param {number} id - Category ID
   * @param {object} data - Updated category data
   * @returns {Promise<object>} Updated category
   */
  update: (id, data) =>
    httpClient(`/asset-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete an asset category
   * @param {number} id - Category ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/asset-categories/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get all assets in a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} List of assets in category
   */
  getAssets: (categoryId) =>
    httpClient(`/asset-categories/${categoryId}/assets`),

  /**
   * Delete multiple asset categories
   * @param {Array<number>} ids - Array of category IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/asset-categories/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default assetCategoryService;
