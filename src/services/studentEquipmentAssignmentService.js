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
  getAll: () => httpClient("/student-equipment-assignments"),

  /**
   * Get a specific assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Promise<object>} Assignment details
   */
  getById: (id) => httpClient(`/student-equipment-assignments/${id}`),

  /**
   * Get assignments by student
   * @param {number} studentId - Student ID
   * @returns {Promise<Array>} List of assignments for the student
   */
  getByStudent: (studentId) => httpClient(`/student-equipment-assignments/by-student/${studentId}`),

  /**
   * Get assignments for current logged-in student
   * @returns {Promise<Array>} List of current student's assignments
   */
  getMine: () => httpClient("/student-equipment-assignments/me"),

  /**
   * Get active checkouts for current logged-in student
   * @returns {Promise<Array>} List of active checkouts
   */
  getMyActiveCheckouts: () => httpClient("/student-equipment-assignments/me/active-checkouts"),

  /**
   * Get assignments by class
   * @param {number} classId - Class ID
   * @returns {Promise<Array>} List of assignments in the class
   */
  getByClass: (classId) => httpClient(`/student-equipment-assignments/by-class/${classId}`),

  /**
   * Get assignments by asset
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of assignments for the asset
   */
  getByAsset: (roomAssetId) => httpClient(`/student-equipment-assignments/by-asset/${roomAssetId}`),

  /**
   * Get available room assets for assignment
   * @returns {Promise<Array>} List of available room assets
   */
  getAvailableAssets: () => httpClient("/student-equipment-assignments/available-assets"),

  /**
   * Get active assignments
   * @returns {Promise<Array>} List of active assignments
   */
  getActive: () => httpClient("/student-equipment-assignments/active"),

  /**
   * Create a new assignment
   * @param {object} data - Assignment data {studentID, roomAssetID, classID, assignedDate, isActive}
   * @returns {Promise<object>} Created assignment
   */
  create: (data) =>
    httpClient("/student-equipment-assignments", {
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
    httpClient(`/student-equipment-assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Unassign equipment from a student
   * @param {number} id - Assignment ID
   * @returns {Promise<void>}
   */
  unassign: (id) =>
    httpClient(`/student-equipment-assignments/${id}/unassign`, {
      method: "POST",
    }),

  /**
   * Checkout an asset by QR code
   * @param {string} qrCodeValue - QR code value from scan
   * @returns {Promise<object>} Updated assignment
   */
  checkoutByQr: (qrCodeValue) =>
    httpClient("/student-equipment-assignments/checkout-by-qr", {
      method: "POST",
      body: JSON.stringify({ qrCodeValue }),
    }),

  /**
   * Checkin an asset by QR code
   * @param {string} qrCodeValue - QR code value from scan
   * @returns {Promise<object>} Updated assignment
   */
  checkinByQr: (qrCodeValue) =>
    httpClient("/student-equipment-assignments/checkin-by-qr", {
      method: "POST",
      body: JSON.stringify({ qrCodeValue }),
    }),

  /**
   * Force return an active assignment
   * @param {number} id - Assignment ID
   * @param {string} reason - Force return reason
   * @returns {Promise<object>} Updated assignment
   */
  forceReturn: (id, reason) =>
    httpClient(`/student-equipment-assignments/${id}/force-return`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  /**
   * Delete an assignment
   * @param {number} id - Assignment ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/student-equipment-assignments/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete assignments
   * @param {Array<number>} ids - Array of assignment IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/student-equipment-assignments/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
