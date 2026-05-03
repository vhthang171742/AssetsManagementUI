/**
 * Course Service
 * Handles all course-related API calls
 */
import { httpClient } from "./httpClient";

export const courseService = {
  /**
   * Get all courses
   * @returns {Promise<Array>} List of courses
   */
  getAll: () => httpClient("/courses"),

  /**
   * Get paged courses with server-side search/sort/filter
   * @param {object} query - { page, pageSize, search, sortBy, sortDirection, isActive }
   */
  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.isActive != null && query.isActive !== "") params.set("isActive", String(query.isActive));

    const queryString = params.toString();
    return httpClient(`/courses/paged${queryString ? `?${queryString}` : ""}`);
  },

  /**
   * Get a specific course by ID
   * @param {number} id - Course ID
   * @returns {Promise<object>} Course details
   */
  getById: (id) => httpClient(`/courses/${id}`),

  /**
   * Get active courses
   * @returns {Promise<Array>} List of active courses
   */
  getActive: () => httpClient("/courses/active"),

  /**
   * Create a new course
   * @param {object} data - Course data {courseName, courseCode, description, durationHours, isActive}
   * @returns {Promise<object>} Created course
   */
  create: (data) =>
    httpClient("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing course
   * @param {number} id - Course ID
   * @param {object} data - Updated course data
   * @returns {Promise<object>} Updated course
   */
  update: (id, data) =>
    httpClient(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a course
   * @param {number} id - Course ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/courses/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete courses
   * @param {Array<number>} ids - Array of course IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/courses/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
