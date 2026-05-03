/**
 * Production Line Service
 * Handles all production line-related API calls
 */
import { httpClient } from "./httpClient";

export const productionLineService = {
  /**
   * Get all production lines
   * @returns {Promise<Array>} List of production lines
   */
  getAll: () => httpClient("/production-lines"),

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.departmentID != null && query.departmentID !== "") params.set("departmentID", String(query.departmentID));
    if (query.isActive != null && query.isActive !== "") params.set("isActive", String(query.isActive));

    const queryString = params.toString();
    return httpClient(`/production-lines/paged${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Get a specific production line by ID
   * @param {number} id - Production Line ID
   * @returns {Promise<object>} Production line details
   */
  getById: (id) => httpClient(`/production-lines/${id}`),

  /**
   * Get production lines by department
   * @param {number} departmentId - Department ID
   * @returns {Promise<Array>} List of production lines in department
   */
  getByDepartment: (departmentId) =>
    httpClient(`/production-lines/by-department/${departmentId}`),

  /**
   * Create a new production line
   * @param {object} data - Production line data {departmentID, lineName, lineCode, orderCode, capacity}
   * @returns {Promise<object>} Created production line
   */
  create: (data) =>
    httpClient("/production-lines", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing production line
   * @param {number} id - Production Line ID
   * @param {object} data - Updated production line data
   * @returns {Promise<object>} Updated production line
   */
  update: (id, data) =>
    httpClient(`/production-lines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a production line
   * @param {number} id - Production Line ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/production-lines/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete production lines
   * @param {Array<number>} ids - Array of production line IDs
   * @returns {Promise<object>} Deletion result
   */
  bulkDelete: (ids) =>
    httpClient("/production-lines/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),

  /**
   * Get workers assigned to a production line
   * @param {number} lineId - Production Line ID
   * @returns {Promise<Array>} List of worker assignments
   */
  getAssignedWorkers: (lineId) =>
    httpClient(`/production-lines/${lineId}/workers`),

  /**
   * Update production line status
   * @param {number} id - Production Line ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<object>} Updated production line
   */
  updateStatus: (id, isActive) =>
    httpClient(`/production-lines/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
};
