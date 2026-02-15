/**
 * Spare Part Service
 * Handles all spare part-related API calls
 */
import { httpClient } from "./httpClient";

export const sparePartService = {
  /**
   * Get all spare parts
   * @returns {Promise<Array>} List of parts
   */
  getAll: () => httpClient("/spare-parts"),

  /**
   * Get a specific spare part by ID
   * @param {number} id - Part ID
   * @returns {Promise<object>} Part details
   */
  getById: (id) => httpClient(`/spare-parts/${id}`),

  /**
   * Get spare part by code
   * @param {string} partCode - Part code
   * @returns {Promise<object>} Part details
   */
  getByCode: (partCode) => httpClient(`/spare-parts/by-code/${partCode}`),

  /**
   * Get low stock parts
   * @returns {Promise<Array>} List of low stock parts
   */
  getLowStock: () => httpClient("/spare-parts/low-stock"),

  /**
   * Get parts needing reorder
   * @returns {Promise<Array>} List of parts needing reorder
   */
  getNeedingReorder: () => httpClient("/spare-parts/needing-reorder"),

  /**
   * Get parts by machine type
   * @param {string} machineType - Machine type
   * @returns {Promise<Array>} List of compatible parts
   */
  getByMachineType: (machineType) => httpClient(`/spare-parts/by-machine-type/${machineType}`),

  /**
   * Create a new spare part
   * @param {object} data - Part data {partName, partCode, manufacturer, compatibleMachineTypes, unitPrice, stockQuantity, reorderLevel, isActive}
   * @returns {Promise<object>} Created part
   */
  create: (data) => httpClient.post("/spare-parts", data),

  /**
   * Update a spare part
   * @param {number} id - Part ID
   * @param {object} data - Updated part data
   * @returns {Promise<object>} Updated part
   */
  update: (id, data) => httpClient.put(`/spare-parts/${id}`, data),

  /**
   * Delete a spare part
   * @param {number} id - Part ID
   * @returns {Promise<object>} Response
   */
  delete: (id) => httpClient.delete(`/spare-parts/${id}`),

  /**
   * Bulk delete spare parts
   * @param {number[]} ids - Array of part IDs
   * @returns {Promise<object>} Response
   */
  bulkDelete: (ids) => httpClient.delete("/spare-parts/bulk", { data: ids }),

  /**
   * Update stock for a spare part
   * @param {number} id - Part ID
   * @param {number} quantityChange - Quantity change (positive or negative)
   * @returns {Promise<object>} Updated part
   */
  updateStock: (id, quantityChange) =>
    httpClient.post(`/spare-parts/${id}/update-stock`, quantityChange),
};
