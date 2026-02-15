/**
 * Maintenance Record Service
 * Handles all maintenance record-related API calls
 */
import { httpClient } from "./httpClient";

export const maintenanceRecordService = {
  /**
   * Get all maintenance records
   * @returns {Promise<Array>} List of records
   */
  getAll: () => httpClient("/maintenance-records"),

  /**
   * Get a specific maintenance record by ID
   * @param {number} id - Record ID
   * @returns {Promise<object>} Record details
   */
  getById: (id) => httpClient(`/maintenance-records/${id}`),

  /**
   * Get records for a specific asset
   * @param {number} assetId - Asset ID
   * @returns {Promise<Array>} List of records for the asset
   */
  getByAsset: (assetId) => httpClient(`/maintenance-records/by-asset/${assetId}`),

  /**
   * Get records by technician
   * @param {number} technicianId - Technician ID
   * @returns {Promise<Array>} List of records
   */
  getByTechnician: (technicianId) => httpClient(`/maintenance-records/by-technician/${technicianId}`),

  /**
   * Get records by date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>} List of records
   */
  getByDateRange: (startDate, endDate) =>
    httpClient(`/maintenance-records/by-date-range?startDate=${startDate}&endDate=${endDate}`),

  /**
   * Create a new maintenance record
   * @param {object} data - Record data {assetID, scheduleID, maintenanceTypeItemID, maintenanceDate, technicianID, failureCategoryItemID, rootCause, repairDurationMinutes, completionStatusItemID, notes}
   * @returns {Promise<object>} Created record
   */
  create: (data) => httpClient.post("/maintenance-records", data),

  /**
   * Update a maintenance record
   * @param {number} id - Record ID
   * @param {object} data - Updated record data
   * @returns {Promise<object>} Updated record
   */
  update: (id, data) => httpClient.put(`/maintenance-records/${id}`, data),

  /**
   * Delete a maintenance record
   * @param {number} id - Record ID
   * @returns {Promise<object>} Response
   */
  delete: (id) => httpClient.delete(`/maintenance-records/${id}`),

  /**
   * Bulk delete maintenance records
   * @param {number[]} ids - Array of record IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) => httpClient.delete("/maintenance-records/bulk", { data: ids }),
};
