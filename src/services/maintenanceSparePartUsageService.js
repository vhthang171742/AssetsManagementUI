/**
 * Maintenance Spare Part Usage Service
 * Handles all maintenance spare part usage-related API calls
 */
import { httpClient } from "./httpClient";

export const maintenanceSparePartUsageService = {
  /**
   * Get all maintenance spare part usages
   * @returns {Promise<Array>} List of usages
   */
  getAll: () => httpClient("/maintenance-spare-part-usages"),

  /**
   * Get a specific usage by ID
   * @param {number} id - Usage ID
   * @returns {Promise<object>} Usage details
   */
  getById: (id) => httpClient(`/maintenance-spare-part-usages/${id}`),

  /**
   * Get usages for a specific maintenance record
   * @param {number} recordId - Maintenance Record ID
   * @returns {Promise<Array>} List of usages for the record
   */
  getByRecord: (recordId) => httpClient(`/maintenance-spare-part-usages/by-record/${recordId}`),

  /**
   * Get usages for a specific spare part
   * @param {number} partId - Part ID
   * @returns {Promise<Array>} List of usages for the part
   */
  getByPart: (partId) => httpClient(`/maintenance-spare-part-usages/by-part/${partId}`),

  /**
   * Get total cost for a maintenance record
   * @param {number} recordId - Maintenance Record ID
   * @returns {Promise<number>} Total cost
   */
  getTotalCostByRecord: (recordId) =>
    httpClient(`/maintenance-spare-part-usages/by-record/${recordId}/total-cost`),

  /**
   * Create a new maintenance spare part usage
   * @param {object} data - Usage data {recordID, partID, quantityUsed, cost}
   * @returns {Promise<object>} Created usage
   */
  create: (data) => httpClient.post("/maintenance-spare-part-usages", data),

  /**
   * Update a maintenance spare part usage
   * @param {number} id - Usage ID
   * @param {object} data - Updated usage data {quantityUsed, cost}
   * @returns {Promise<object>} Updated usage
   */
  update: (id, data) => httpClient.put(`/maintenance-spare-part-usages/${id}`, data),

  /**
   * Delete a maintenance spare part usage
   * @param {number} id - Usage ID
   * @returns {Promise<object>} Response
   */
  delete: (id) =>
    httpClient(`/maintenance-spare-part-usages/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete maintenance spare part usages
   * @param {number[]} ids - Array of usage IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) =>
    httpClient("/maintenance-spare-part-usages/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
