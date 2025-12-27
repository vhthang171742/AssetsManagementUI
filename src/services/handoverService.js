/**
 * Handover Service
 * Handles all handover and handover details-related API calls
 */
import { httpClient } from "./httpClient";

export const handoverService = {
  /**
   * Get all handovers
   * @returns {Promise<Array>} List of handovers
   */
  getAll: () => httpClient("/Handovers"),

  /**
   * Get a specific handover by ID
   * @param {number} id - Handover ID
   * @returns {Promise<object>} Handover details
   */
  getById: (id) => httpClient(`/Handovers/${id}`),

  /**
   * Create a new handover
   * @param {object} data - Handover data {roomID, handoverDate, deliveredBy, receivedBy, notes}
   * @returns {Promise<object>} Created handover
   */
  create: (data) =>
    httpClient("/Handovers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing handover
   * @param {number} id - Handover ID
   * @param {object} data - Updated handover data
   * @returns {Promise<object>} Updated handover
   */
  update: (id, data) =>
    httpClient(`/Handovers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a handover
   * @param {number} id - Handover ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/Handovers/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get all handovers for a room
   * @param {number} roomId - Room ID
   * @returns {Promise<Array>} List of handovers for room
   */
  getByRoom: (roomId) => httpClient(`/Handovers/by-room/${roomId}`),

  /**
   * Get all details for a handover
   * @param {number} handoverId - Handover ID
   * @returns {Promise<Array>} List of handover details
   */
  getDetails: (handoverId) =>
    httpClient(`/Handovers/${handoverId}/details`),

  /**
   * Add a detail to a handover
   * @param {number} handoverId - Handover ID
   * @param {object} data - Detail data {assetID, quantity, conditionAtHandover, remarks}
   * @returns {Promise<object>} Created handover detail
   */
  addDetail: (handoverId, data) =>
    httpClient(`/Handovers/${handoverId}/details`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Get a specific handover detail by ID
   * @param {number} detailId - Handover detail ID
   * @returns {Promise<object>} Handover detail
   */
  getDetailById: (detailId) =>
    httpClient(`/Handovers/details/${detailId}`),

  /**
   * Update a handover detail
   * @param {number} detailId - Handover detail ID
   * @param {object} data - Updated detail data
   * @returns {Promise<object>} Updated handover detail
   */
  updateDetail: (detailId, data) =>
    httpClient(`/Handovers/details/${detailId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a handover detail
   * @param {number} detailId - Handover detail ID
   * @returns {Promise<null>} No content response
   */
  deleteDetail: (detailId) =>
    httpClient(`/Handovers/details/${detailId}`, {
      method: "DELETE",
    }),

  /**
   * Delete multiple handovers
   * @param {Array<number>} ids - Array of handover IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/Handovers/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default handoverService;
