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
