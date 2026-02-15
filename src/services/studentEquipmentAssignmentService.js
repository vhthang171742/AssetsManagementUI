/**
 * Student Equipment Assignment Service
 * Handles all student equipment assignment-related API calls
 */
import { httpClient } from "./httpClient";

export const studentEquipmentAssignmentService = {
  /**
   * Get all assignments
   * @returns {Promise<Array>} List of assignments
   */
  getAll: () => httpClient("/StudentEquipmentAssignments"),

  /**
   * Get a specific assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Promise<object>} Assignment details
   */
  getById: (id) => httpClient(`/StudentEquipmentAssignments/${id}`),

  /**
   * Get assignments by student
   * @param {number} studentId - Student ID
   * @returns {Promise<Array>} List of assignments for the student
   */
  getByStudent: (studentId) => httpClient(`/StudentEquipmentAssignments/by-student/${studentId}`),

  /**
   * Get assignments by class
   * @param {number} classId - Class ID
   * @returns {Promise<Array>} List of assignments in the class
   */
  getByClass: (classId) => httpClient(`/StudentEquipmentAssignments/by-class/${classId}`),

  /**
   * Get assignments by asset
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of assignments for the asset
   */
  getByAsset: (roomAssetId) => httpClient(`/StudentEquipmentAssignments/by-asset/${roomAssetId}`),

  /**
   * Get active assignments
   * @returns {Promise<Array>} List of active assignments
   */
  getActive: () => httpClient("/StudentEquipmentAssignments/active"),

  /**
   * Create a new assignment
   * @param {object} data - Assignment data {studentID, roomAssetID, classID, assignedDate, isActive}
   * @returns {Promise<object>} Created assignment
   */
  create: (data) =>
    httpClient("/StudentEquipmentAssignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing assignment
   * @param {number} id - Assignment ID
   * @param {object} data - Updated assignment data
   * @returns {Promise<object>} Updated assignment
   */
  update: (id, data) =>
    httpClient(`/StudentEquipmentAssignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Unassign equipment from a student
   * @param {number} id - Assignment ID
   * @returns {Promise<void>}
   */
  unassign: (id) =>
    httpClient(`/StudentEquipmentAssignments/${id}/unassign`, {
      method: "POST",
    }),

  /**
   * Delete an assignment
   * @param {number} id - Assignment ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/StudentEquipmentAssignments/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete assignments
   * @param {Array<number>} ids - Array of assignment IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/StudentEquipmentAssignments/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
