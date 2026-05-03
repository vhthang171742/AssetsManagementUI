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

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.assetID != null && query.assetID !== "") params.set("assetID", String(query.assetID));
    if (query.maintenanceTypeItemID != null && query.maintenanceTypeItemID !== "") params.set("maintenanceTypeItemID", String(query.maintenanceTypeItemID));
    if (query.isActive != null && query.isActive !== "") params.set("isActive", String(query.isActive));

    const queryString = params.toString();
    return httpClient(`/maintenance-schedules/paged${queryString ? `?${queryString}` : ""}`);
  },

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
  delete: (id) =>
    httpClient(`/maintenance-schedules/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete maintenance schedules
   * @param {number[]} ids - Array of schedule IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) =>
    httpClient("/maintenance-schedules/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
