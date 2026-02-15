/**
 * Class Service
 * Handles all class-related API calls
 */
import { httpClient } from "./httpClient";

export const classService = {
  /**
   * Get all classes
   * @returns {Promise<Array>} List of classes
   */
  getAll: () => httpClient("/Classes"),

  /**
   * Get a specific class by ID
   * @param {number} id - Class ID
   * @returns {Promise<object>} Class details
   */
  getById: (id) => httpClient(`/Classes/${id}`),

  /**
   * Get classes by course
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} List of classes for the course
   */
  getByCourse: (courseId) => httpClient(`/Classes/by-course/${courseId}`),

  /**
   * Get classes by instructor
   * @param {number} instructorId - Instructor ID
   * @returns {Promise<Array>} List of classes taught by the instructor
   */
  getByInstructor: (instructorId) => httpClient(`/Classes/by-instructor/${instructorId}`),

  /**
   * Get active classes
   * @returns {Promise<Array>} List of active classes
   */
  getActive: () => httpClient("/Classes/active"),

  /**
   * Get enrolled student count for a class
   * @param {number} classId - Class ID
   * @returns {Promise<number>} Count of enrolled students
   */
  getStudentCount: (classId) => httpClient(`/Classes/${classId}/student-count`),

  /**
   * Create a new class
   * @param {object} data - Class data {className, classCode, description, courseID, instructorID, startDate, endDate, maxStudents, isActive}
   * @returns {Promise<object>} Created class
   */
  create: (data) =>
    httpClient("/Classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing class
   * @param {number} id - Class ID
   * @param {object} data - Updated class data
   * @returns {Promise<object>} Updated class
   */
  update: (id, data) =>
    httpClient(`/Classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a class
   * @param {number} id - Class ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/Classes/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete classes
   * @param {Array<number>} ids - Array of class IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/Classes/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
