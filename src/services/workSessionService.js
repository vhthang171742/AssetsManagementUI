import { httpClient } from "./httpClient";

/**
 * Work Session Service (Phase 13 — Production Worker Flow)
 * Handles QR check-in/check-out and session management for production workers.
 */
export const workSessionService = {
  // ── Worker (self) endpoints ───────────────────────────────────────────────

  checkinByQr: (qrCodeValue) =>
    httpClient("/work-sessions/me/checkin-by-qr", {
      method: "POST",
      body: JSON.stringify({ qrCodeValue }),
    }),

  checkoutByQr: (qrCodeValue, quantityProduced = null, qualityNotes = null) =>
    httpClient("/work-sessions/me/checkout-by-qr", {
      method: "POST",
      body: JSON.stringify({
        qrCodeValue,
        quantityProduced: quantityProduced != null ? Number(quantityProduced) : null,
        qualityNotes: qualityNotes || null,
      }),
    }),

  getMyActive: () => httpClient("/work-sessions/me/active"),

  getMyHistory: (query = {}) => {
    const params = new URLSearchParams();
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    if (query.approvalStatus != null) params.set("approvalStatus", String(query.approvalStatus));
    const qs = params.toString();
    return httpClient(`/work-sessions/me/history${qs ? `?${qs}` : ""}`);
  },

  getMyCalendar: (year, month) =>
    httpClient(`/work-sessions/me/calendar?year=${year}&month=${month}`),

  // ── Manager endpoints ─────────────────────────────────────────────────────

  getSessions: (query = {}) => {
    const params = new URLSearchParams();
    if (query.workerID != null) params.set("workerID", String(query.workerID));
    if (query.productionStepID != null) params.set("productionStepID", String(query.productionStepID));
    if (query.productionOrderID != null) params.set("productionOrderID", String(query.productionOrderID));
    if (query.approvalStatus != null) params.set("approvalStatus", String(query.approvalStatus));
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    if (query.activeOnly != null) params.set("activeOnly", String(query.activeOnly));
    const qs = params.toString();
    return httpClient(`/work-sessions${qs ? `?${qs}` : ""}`);
  },

  getById: (id) => httpClient(`/work-sessions/${id}`),

  forceClose: (id, reason) =>
    httpClient(`/work-sessions/${id}/force-close`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  approve: (id, notes = null) =>
    httpClient(`/work-sessions/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  reject: (id, notes) =>
    httpClient(`/work-sessions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  getStepProgress: (stepId) =>
    httpClient(`/work-sessions/step/${stepId}/progress`),

  getWorkerCalendar: (workerId, year, month) =>
    httpClient(`/work-sessions/worker/${workerId}/calendar?year=${year}&month=${month}`),
};
