import { httpClient } from "./httpClient";

/**
 * Production Manager Service — line scope assignment
 */
export const productionManagerService = {
  /** Get all active production managers (admin use — for dropdowns). */
  getAll: () => httpClient("/production-managers"),

  /** Get lines assigned to the current PM. Returns { items, isUnscoped }. */
  getMyLines: () => httpClient("/production-managers/me/lines"),

  /** Get lines assigned to a specific PM (admin only). */
  getLines: (productionManagerId) =>
    httpClient(`/production-managers/${productionManagerId}/lines`),

  /** Assign a production line to a PM (admin only). */
  assignLine: (productionManagerId, productionLineId) =>
    httpClient(`/production-managers/${productionManagerId}/lines/${productionLineId}`, {
      method: "POST",
    }),

  /** Remove a production line from a PM (admin only). */
  removeLine: (productionManagerId, productionLineId) =>
    httpClient(`/production-managers/${productionManagerId}/lines/${productionLineId}`, {
      method: "DELETE",
    }),
};
