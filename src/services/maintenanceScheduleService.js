/**
 * Maintenance Schedule Service
 * Handles all maintenance schedule-related API calls
 */
import { httpClient } from "./httpClient";

export const maintenanceScheduleService = {
  /**
   * Get all maintenance schedules
   * @returns {Promise<Array>} List of schedules
   */
  getAll: () => httpClient("/maintenance-schedules"),

  /**
   * Get a specific maintenance schedule by ID
   * @param {number} id - Schedule ID
   * @returns {Promise<object>} Schedule details
   */
  getById: (id) => httpClient(`/maintenance-schedules/${id}`),

  /**
   * Get schedules for a specific asset
   * @param {number} assetId - Asset ID
   * @returns {Promise<Array>} List of schedules for the asset
   */
  getByAsset: (assetId) => httpClient(`/maintenance-schedules/by-asset/${assetId}`),

  /**
   * Get active schedules
   * @returns {Promise<Array>} List of active schedules
   */
  getActive: () => httpClient("/maintenance-schedules/active"),

  /**
   * Create a new maintenance schedule
   * @param {object} data - Schedule data {assetID, maintenanceTypeItemID, frequency, description, lastMaintenanceDate, nextDueDate, isActive}
   * @returns {Promise<object>} Created schedule
   */
  create: (data) => httpClient.post("/maintenance-schedules", data),

  /**
   * Update a maintenance schedule
   * @param {number} id - Schedule ID
   * @param {object} data - Updated schedule data
   * @returns {Promise<object>} Updated schedule
   */
  update: (id, data) => httpClient.put(`/maintenance-schedules/${id}`, data),

  /**
   * Delete a maintenance schedule
   * @param {number} id - Schedule ID
   * @returns {Promise<object>} Response
   */
  delete: (id) => httpClient.delete(`/maintenance-schedules/${id}`),

  /**
   * Bulk delete maintenance schedules
   * @param {number[]} ids - Array of schedule IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) => httpClient.delete("/maintenance-schedules/bulk", { data: ids }),
};
