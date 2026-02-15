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
  getAll: () => httpClient("/ProductionLines"),

  /**
   * Get a specific production line by ID
   * @param {number} id - Production Line ID
   * @returns {Promise<object>} Production line details
   */
  getById: (id) => httpClient(`/ProductionLines/${id}`),

  /**
   * Get production lines by department
   * @param {number} departmentId - Department ID
   * @returns {Promise<Array>} List of production lines in department
   */
  getByDepartment: (departmentId) =>
    httpClient(`/ProductionLines/by-department/${departmentId}`),

  /**
   * Create a new production line
   * @param {object} data - Production line data {departmentID, lineName, lineCode, orderCode, capacity}
   * @returns {Promise<object>} Created production line
   */
  create: (data) =>
    httpClient("/ProductionLines", {
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
    httpClient(`/ProductionLines/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a production line
   * @param {number} id - Production Line ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/ProductionLines/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete production lines
   * @param {Array<number>} ids - Array of production line IDs
   * @returns {Promise<object>} Deletion result
   */
  bulkDelete: (ids) =>
    httpClient("/ProductionLines/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  /**
   * Get workers assigned to a production line
   * @param {number} lineId - Production Line ID
   * @returns {Promise<Array>} List of worker assignments
   */
  getAssignedWorkers: (lineId) =>
    httpClient(`/ProductionLines/${lineId}/workers`),

  /**
   * Update production line status
   * @param {number} id - Production Line ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<object>} Updated production line
   */
  updateStatus: (id, isActive) =>
    httpClient(`/ProductionLines/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
};
