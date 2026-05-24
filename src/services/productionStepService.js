/**
 * Production Step Service
 * Handles all production step-related API calls (sublevel under ProductionOrder)
 */
import { httpClient } from "./httpClient";

export const productionStepService = {
  getAll: () => httpClient("/production-steps"),

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.productionOrderID != null && query.productionOrderID !== "") params.set("productionOrderID", String(query.productionOrderID));
    if (query.status != null && query.status !== "") params.set("status", String(query.status));
    if (query.isActive != null && query.isActive !== "") params.set("isActive", String(query.isActive));
    const queryString = params.toString();
    return httpClient(`/production-steps/paged${queryString ? `?${queryString}` : ""}`);
  },

  getById: (id) => httpClient(`/production-steps/${id}`),

  getByOrder: (productionOrderId) =>
    httpClient(`/production-steps/by-order/${productionOrderId}`),

  create: (data) =>
    httpClient("/production-steps", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    httpClient(`/production-steps/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    httpClient(`/production-steps/${id}`, {
      method: "DELETE",
    }),

  bulkDelete: (ids) =>
    httpClient("/production-steps/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),

  getWorkers: (stepId) =>
    httpClient(`/production-steps/${stepId}/workers`),

  addWorker: (stepId, workerId) =>
    httpClient(`/production-steps/${stepId}/workers/${workerId}`, {
      method: "POST",
    }),

  removeWorker: (stepId, workerId) =>
    httpClient(`/production-steps/${stepId}/workers/${workerId}`, {
      method: "DELETE",
    }),
};
