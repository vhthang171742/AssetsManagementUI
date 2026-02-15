/**
 * Equipment Usage Service
 * Handles all equipment usage log-related API calls
 */
import { httpClient } from "./httpClient";

export const equipmentUsageService = {
  /**
   * Get all equipment usage logs
   * @returns {Promise<Array>} List of usage logs
   */
  getAll: () => httpClient("/EquipmentUsage"),

  /**
   * Get a specific usage log by ID
   * @param {number} id - Usage Log ID
   * @returns {Promise<object>} Usage log details
   */
  getById: (id) => httpClient(`/EquipmentUsage/${id}`),

  /**
   * Get usage logs for a specific equipment
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of usage logs for equipment
   */
  getByEquipment: (roomAssetId) =>
    httpClient(`/EquipmentUsage/by-equipment/${roomAssetId}`),

  /**
   * Get usage logs for a specific worker
   * @param {number} workerId - Worker ID
   * @returns {Promise<Array>} List of usage logs for worker
   */
  getByWorker: (workerId) =>
    httpClient(`/EquipmentUsage/by-worker/${workerId}`),

  /**
   * Get usage logs for a production line
   * @param {number} lineId - Production Line ID
   * @returns {Promise<Array>} List of usage logs for line
   */
  getByLine: (lineId) =>
    httpClient(`/EquipmentUsage/by-line/${lineId}`),

  /**
   * Get usage logs for a date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>} List of usage logs in range
   */
  getByDateRange: (startDate, endDate) =>
    httpClient(`/EquipmentUsage/by-date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),

  /**
   * Create a new equipment usage log
   * @param {object} data - Usage log data {roomAssetID, workerID, productionLineID, startTime, endTime, runningMinutes, downtimeMinutes, stitchCount, notes}
   * @returns {Promise<object>} Created usage log
   */
  create: (data) =>
    httpClient("/EquipmentUsage", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Start equipment usage session
   * @param {object} data - Session start data {roomAssetID, workerID, productionLineID, startTime}
   * @returns {Promise<object>} Usage log with session started
   */
  startSession: (data) =>
    httpClient("/EquipmentUsage/start-session", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * End equipment usage session
   * @param {number} logId - Usage Log ID
   * @param {object} data - Session end data {endTime, runningMinutes, downtimeMinutes, stitchCount, notes}
   * @returns {Promise<object>} Completed usage log
   */
  endSession: (logId, data) =>
    httpClient(`/EquipmentUsage/${logId}/end-session`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing usage log
   * @param {number} id - Usage Log ID
   * @param {object} data - Updated usage log data
   * @returns {Promise<object>} Updated usage log
   */
  update: (id, data) =>
    httpClient(`/EquipmentUsage/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a usage log
   * @param {number} id - Usage Log ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/EquipmentUsage/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get equipment utilization summary
   * @param {number} lineId - Production Line ID (optional)
   * @returns {Promise<object>} Utilization metrics
   */
  getUtilizationSummary: (lineId) =>
    httpClient(`/EquipmentUsage/summary${lineId ? `?lineId=${lineId}` : ""}`),

  /**
   * Get equipment running hours
   * @param {number} roomAssetId - Room Asset ID
   * @param {string} startDate - Start date (ISO format, optional)
   * @param {string} endDate - End date (ISO format, optional)
   * @returns {Promise<object>} Running hours details
   */
  getRunningHours: (roomAssetId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return httpClient(
      `/EquipmentUsage/${roomAssetId}/running-hours${params.toString() ? `?${params.toString()}` : ""}`
    );
  },
};
