/**
 * Worker Equipment Service
 * Handles all worker equipment assignment-related API calls
 */
import { httpClient } from "./httpClient";

export const workerEquipmentService = {
  /**
   * Get all worker equipment assignments
   * @returns {Promise<Array>} List of assignments
   */
  getAll: () => httpClient("/worker-equipment"),

  /**
   * Get a specific assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Promise<object>} Assignment details
   */
  getById: (id) => httpClient(`/worker-equipment/${id}`),

  /**
   * Get assignments for a specific worker
   * @param {number} workerId - Worker ID
   * @returns {Promise<Array>} List of assignments for worker
   */
  getByWorker: (workerId) =>
    httpClient(`/worker-equipment/by-worker/${workerId}`),

  /**
   * Get assignments for a specific equipment
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of assignments for equipment
   */
  getByEquipment: (roomAssetId) =>
    httpClient(`/worker-equipment/by-equipment/${roomAssetId}`),

  /**
   * Get active assignments for a production line
   * @param {number} lineId - Production Line ID
   * @returns {Promise<Array>} List of active assignments
   */
  getByLine: (lineId) =>
    httpClient(`/worker-equipment/by-line/${lineId}`),

  /**
   * Create a new worker equipment assignment
   * @param {object} data - Assignment data {workerID, roomAssetID, assignedDate}
   * @returns {Promise<object>} Created assignment
   */
  create: (data) =>
    httpClient("/worker-equipment", {
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
    httpClient(`/worker-equipment/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Unassign equipment from worker
   * @param {number} id - Assignment ID
   * @param {string} unassignedDate - Unassignment date
   * @returns {Promise<object>} Updated assignment
   */
  unassign: (id, unassignedDate) =>
    httpClient(`/worker-equipment/${id}/unassign`, {
      method: "PATCH",
      body: JSON.stringify({ unassignedDate }),
    }),

  /**
   * Delete an assignment
   * @param {number} id - Assignment ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/worker-equipment/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete assignments
   * @param {Array<number>} ids - Array of assignment IDs
   * @returns {Promise<object>} Deletion result
   */
  bulkDelete: (ids) =>
    httpClient("/worker-equipment/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};
