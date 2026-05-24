/**
 * Production Order Service
 * Handles all production order-related API calls (sublevel under ProductionLine)
 */
import { httpClient } from "./httpClient";

export const productionOrderService = {
  getAll: () => httpClient("/production-orders"),

  getPaged: (query = {}) => {
    const params = new URLSearchParams();
    if (query.page != null) params.set("page", String(query.page));
    if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.productionLineID != null && query.productionLineID !== "") params.set("productionLineID", String(query.productionLineID));
    if (query.status != null && query.status !== "") params.set("status", String(query.status));
    if (query.priority != null && query.priority !== "") params.set("priority", String(query.priority));
    if (query.isActive != null && query.isActive !== "") params.set("isActive", String(query.isActive));
    const queryString = params.toString();
    return httpClient(`/production-orders/paged${queryString ? `?${queryString}` : ""}`);
  },

  getById: (id) => httpClient(`/production-orders/${id}`),

  getByLine: (productionLineId) =>
    httpClient(`/production-orders/by-line/${productionLineId}`),

  create: (data) =>
    httpClient("/production-orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    httpClient(`/production-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    httpClient(`/production-orders/${id}`, {
      method: "DELETE",
    }),

  bulkDelete: (ids) =>
    httpClient("/production-orders/bulk", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};
