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

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.departmentID != null && query.departmentID !== "") params.set("departmentID", String(query.departmentID));

    const queryString = params.toString();
    return httpClient(`/rooms/paged${queryString ? `?${queryString}` : ""}`);
  },

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
   * Remove an asset from a room
   * @param {number} roomId - Room ID
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<null>} No content response
   */
  removeAsset: (roomId, roomAssetId) =>
    httpClient(`/rooms/${roomId}/assets/${roomAssetId}`, {
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
   * Update room asset metadata
   * @param {number} roomId - Room ID
   * @param {number} roomAssetId - Room Asset ID
   * @param {object} data - Updated room asset data
   * @returns {Promise<object>} Updated room asset
   */
  updateAsset: (roomId, roomAssetId, data) =>
    httpClient(`/rooms/${roomId}/assets/${roomAssetId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

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
