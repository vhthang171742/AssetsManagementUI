/**
 * Department Service
 * Handles all department-related API calls
 */
import { httpClient } from "./httpClient";

export const departmentService = {
  /**
   * Get all departments
   * @returns {Promise<Array>} List of departments
   */
  getAll: () => httpClient("/departments"),

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);

    const queryString = params.toString();
    return httpClient(`/departments/paged${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Get a specific department by ID
   * @param {number} id - Department ID
   * @returns {Promise<object>} Department details
   */
  getById: (id) => httpClient(`/departments/${id}`),

  /**
   * Create a new department
   * @param {object} data - Department data {departmentCode, departmentName}
   * @returns {Promise<object>} Created department
   */
  create: (data) =>
    httpClient("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing department
   * @param {number} id - Department ID
   * @param {object} data - Updated department data
   * @returns {Promise<object>} Updated department
   */
  update: (id, data) =>
    httpClient(`/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a department
   * @param {number} id - Department ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/departments/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get all rooms in a department
   * @param {number} departmentId - Department ID
   * @returns {Promise<Array>} List of rooms in department
   */
  getRooms: (departmentId) =>
    httpClient(`/departments/${departmentId}/rooms`),

  /**
   * Delete multiple departments
   * @param {Array<number>} ids - Array of department IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/departments/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default departmentService;
