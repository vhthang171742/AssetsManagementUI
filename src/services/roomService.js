/**
 * Room Service
 * Handles all room-related API calls
 */
import { httpClient } from "./httpClient";

export const roomService = {
  /**
   * Get all rooms
   * @returns {Promise<Array>} List of rooms
   */
  getAll: () => httpClient("/rooms"),

  /**
   * Get a specific room by ID
   * @param {number} id - Room ID
   * @returns {Promise<object>} Room details
   */
  getById: (id) => httpClient(`/rooms/${id}`),

  /**
   * Create a new room
   * @param {object} data - Room data {departmentID, roomName, description}
   * @returns {Promise<object>} Created room
   */
  create: (data) =>
    httpClient("/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an existing room
   * @param {number} id - Room ID
   * @param {object} data - Updated room data
   * @returns {Promise<object>} Updated room
   */
  update: (id, data) =>
    httpClient(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a room
   * @param {number} id - Room ID
   * @returns {Promise<null>} No content response
   */
  delete: (id) =>
    httpClient(`/rooms/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get all assets in a room
   * @param {number} roomId - Room ID
   * @returns {Promise<Array>} List of assets in room
   */
  getAssets: (roomId) => httpClient(`/rooms/${roomId}/assets`),

  /**
   * Add an asset to a room
   * @param {number} roomId - Room ID
   * @param {object} data - Asset data {assetID, serialNumber, currentCondition, remarks}
   * @returns {Promise<object>} Created room-asset association
   */
  addAsset: (roomId, data) =>
    httpClient(`/rooms/${roomId}/assets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Remove an asset from a room
   * @param {number} roomId - Room ID
   * @param {number} assetId - Asset ID
   * @returns {Promise<null>} No content response
   */
  removeAsset: (roomId, assetId) =>
    httpClient(`/rooms/${roomId}/assets/${assetId}`, {
      method: "DELETE",
    }),

  /**
   * Get all rooms in a department
   * @param {number} departmentId - Department ID
   * @returns {Promise<Array>} List of rooms in department
   */
  getByDepartment: (departmentId) =>
    httpClient(`/rooms/department/${departmentId}`),

  /**
   * Delete multiple rooms
   * @param {Array<number>} ids - Array of room IDs to delete
   * @returns {Promise<null>} No content response
   */
  bulkDelete: (ids) =>
    httpClient(`/rooms/bulk`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

export default roomService;
