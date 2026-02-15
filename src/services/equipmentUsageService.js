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
  getAll: () => httpClient("/equipment-usage"),

  /**
   * Get a specific usage log by ID
   * @param {number} id - Usage Log ID
   * @returns {Promise<object>} Usage log details
   */
  getById: (id) => httpClient(`/equipment-usage/${id}`),

  /**
   * Get usage logs for a specific equipment
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of usage logs for equipment
   */
  getByEquipment: (roomAssetId) =>
    httpClient(`/equipment-usage/by-equipment/${roomAssetId}`),

  /**
   * Get usage logs for a specific worker
   * @param {number} workerId - Worker ID
   * @returns {Promise<Array>} List of usage logs for worker
   */
  getByWorker: (workerId) =>
    httpClient(`/equipment-usage/by-worker/${workerId}`),

  /**
   * Get usage logs for a production line
   * @param {number} lineId - Production Line ID
   * @returns {Promise<Array>} List of usage logs for line
   */
  getByLine: (lineId) =>
    httpClient(`/equipment-usage/by-line/${lineId}`),

  /**
   * Get usage logs for a date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>} List of usage logs in range
   */
  getByDateRange: (startDate, endDate) =>
    httpClient(`/equipment-usage/by-date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),

  /**
   * Create a new equipment usage log
   * @param {object} data - Usage log data {roomAssetID, workerID, productionLineID, startTime, endTime, runningMinutes, downtimeMinutes, stitchCount, notes}
   * @returns {Promise<object>} Created usage log
   */
  create: (data) =>
    httpClient("/equipment-usage", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Start equipment usage session
   * @param {object} data - Session start data {roomAssetID, workerID, productionLineID, startTime}
   * @returns {Promise<object>} Usage log with session started
   */
  startSession: (data) =>
    httpClient("/equipment-usage/start-session", {
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
    httpClient(`/equipment-usage/${logId}/end-session`, {
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
    httpClient(`/equipment-usage/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a usage log
   * @param {number} id - Usage Log ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/equipment-usage/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get equipment utilization summary
   * @param {number} lineId - Production Line ID (optional)
   * @returns {Promise<object>} Utilization metrics
   */
  getUtilizationSummary: (lineId) =>
    httpClient(`/equipment-usage/summary${lineId ? `?lineId=${lineId}` : ""}`),

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
      `/equipment-usage/${roomAssetId}/running-hours${params.toString() ? `?${params.toString()}` : ""}`
    );
  },
};
