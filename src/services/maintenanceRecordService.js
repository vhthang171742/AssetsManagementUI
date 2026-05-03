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

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.assetID != null && query.assetID !== "") params.set("assetID", String(query.assetID));
    if (query.maintenanceTypeItemID != null && query.maintenanceTypeItemID !== "") params.set("maintenanceTypeItemID", String(query.maintenanceTypeItemID));
    if (query.completionStatusItemID != null && query.completionStatusItemID !== "") params.set("completionStatusItemID", String(query.completionStatusItemID));

    const queryString = params.toString();
    return httpClient(`/maintenance-records/paged${queryString ? `?${queryString}` : ""}`);
  },

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
  delete: (id) =>
    httpClient(`/maintenance-records/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete maintenance records
   * @param {number[]} ids - Array of record IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) =>
    httpClient("/maintenance-records/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
