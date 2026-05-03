/**
 * Asset Course Mapping Service
 * Handles all asset course mapping-related API calls
 */
import { httpClient } from "./httpClient";

export const assetCourseMappingService = {
  /**
   * Get all mappings
   * @returns {Promise<Array>} List of mappings
   */
  getAll: () => httpClient("/asset-course-mappings"),

  /**
   * Get paged mappings with server-side search/sort/filter
   * @param {object} query - { page, pageSize, search, sortBy, sortDirection, courseID, isRequired }
   */
  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.courseID != null && query.courseID !== "") params.set("courseID", String(query.courseID));
    if (query.isRequired != null && query.isRequired !== "") params.set("isRequired", String(query.isRequired));

    const queryString = params.toString();
    return httpClient(`/asset-course-mappings/paged${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Get a specific mapping by ID
   * @param {number} id - Mapping ID
   * @returns {Promise<object>} Mapping details
   */
  getById: (id) => httpClient(`/asset-course-mappings/${id}`),

  /**
   * Get mappings by course
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} List of mappings for the course
   */
  getByCourse: (courseId) => httpClient(`/asset-course-mappings/by-course/${courseId}`),

  /**
   * Get mappings by asset
   * @param {number} assetId - Asset ID
   * @returns {Promise<Array>} List of mappings for the asset
   */
  getByAsset: (assetId) => httpClient(`/asset-course-mappings/by-asset/${assetId}`),

  /**
   * Get required assets by course
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} List of required assets for the course
   */
  getRequiredAssets: (courseId) => httpClient(`/asset-course-mappings/by-course/${courseId}/required`),

  /**
   * Create a new mapping
   * @param {object} data - Mapping data {assetID, courseID, isRequired}
   * @returns {Promise<object>} Created mapping
   */
  create: (data) =>
    httpClient("/asset-course-mappings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing mapping
   * @param {number} id - Mapping ID
   * @param {object} data - Updated mapping data
   * @returns {Promise<object>} Updated mapping
   */
  update: (id, data) =>
    httpClient(`/asset-course-mappings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a mapping
   * @param {number} id - Mapping ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/asset-course-mappings/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete mappings
   * @param {Array<number>} ids - Array of mapping IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/asset-course-mappings/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
