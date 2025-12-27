// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API Error: ${response.statusText}`
      );
    }

    if (response.status === 204) {
      return null; // No content response
    }

    return await response.json();
  } catch (error) {
    console.error("API Call Error:", error);
    throw error;
  }
};

// ============ ASSET CATEGORIES ============
export const assetCategoryService = {
  getAll: () =>
    apiCall("/AssetCategories"),

  getById: (id) =>
    apiCall(`/AssetCategories/${id}`),

  create: (data) =>
    apiCall("/AssetCategories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/AssetCategories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/AssetCategories/${id}`, {
      method: "DELETE",
    }),

  getAssets: (categoryId) =>
    apiCall(`/AssetCategories/${categoryId}/assets`),
};

// ============ ASSETS ============
export const assetService = {
  getAll: () =>
    apiCall("/Assets"),

  getById: (id) =>
    apiCall(`/Assets/${id}`),

  getByCode: (assetCode) =>
    apiCall(`/Assets/by-code/${assetCode}`),

  getByCategory: (categoryId) =>
    apiCall(`/Assets/by-category/${categoryId}`),

  getUnits: () =>
    apiCall("/Assets/units"),

  create: (data) =>
    apiCall("/Assets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/Assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/Assets/${id}`, {
      method: "DELETE",
    }),

  updateQuantity: (id, quantityChange) =>
    apiCall(`/Assets/${id}/quantity`, {
      method: "PATCH",
      body: JSON.stringify({ quantityChange }),
    }),
};

// ============ DEPARTMENTS ============
export const departmentService = {
  getAll: () =>
    apiCall("/Departments"),

  getById: (id) =>
    apiCall(`/Departments/${id}`),

  create: (data) =>
    apiCall("/Departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/Departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/Departments/${id}`, {
      method: "DELETE",
    }),

  getRooms: (departmentId) =>
    apiCall(`/Departments/${departmentId}/rooms`),
};

// ============ ROOMS ============
export const roomService = {
  getAll: () =>
    apiCall("/Rooms"),

  getById: (id) =>
    apiCall(`/Rooms/${id}`),

  create: (data) =>
    apiCall("/Rooms", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/Rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/Rooms/${id}`, {
      method: "DELETE",
    }),

  getAssets: (roomId) =>
    apiCall(`/Rooms/${roomId}/assets`),

  addAsset: (roomId, data) =>
    apiCall(`/Rooms/${roomId}/assets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeAsset: (roomId, assetId) =>
    apiCall(`/Rooms/${roomId}/assets/${assetId}`, {
      method: "DELETE",
    }),

  getByDepartment: (departmentId) =>
    apiCall(`/Rooms/department/${departmentId}`),
};

// ============ HANDOVERS ============
export const handoverService = {
  getAll: () =>
    apiCall("/Handovers"),

  getById: (id) =>
    apiCall(`/Handovers/${id}`),

  create: (data) =>
    apiCall("/Handovers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiCall(`/Handovers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/Handovers/${id}`, {
      method: "DELETE",
    }),

  getByRoom: (roomId) =>
    apiCall(`/Handovers/by-room/${roomId}`),

  getDetails: (handoverId) =>
    apiCall(`/Handovers/${handoverId}/details`),

  addDetail: (handoverId, data) =>
    apiCall(`/Handovers/${handoverId}/details`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDetailById: (detailId) =>
    apiCall(`/Handovers/details/${detailId}`),

  updateDetail: (detailId, data) =>
    apiCall(`/Handovers/details/${detailId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteDetail: (detailId) =>
    apiCall(`/Handovers/details/${detailId}`, {
      method: "DELETE",
    }),
};
