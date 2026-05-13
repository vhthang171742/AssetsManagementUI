/**
 * Asset Lifecycle Service
 * Handles asset lifecycle state machine API calls (Phase 14)
 */
import { httpClient } from "./httpClient";

export const assetLifecycleService = {
  /**
   * Report an issue for a room asset without requiring an active session.
   */
  reportRoomAssetIssue: (roomAssetId, data) =>
    httpClient(`/asset-lifecycle/room-assets/${roomAssetId}/report-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  /**
   * Get all open maintenance jobs (for technician queue)
   */
  getOpenJobs: () => httpClient("/asset-lifecycle/jobs"),

  /**
   * Technician starts work on a job -> asset transitions PENDING -> MAINTENANCE
   */
  startWork: (jobId) =>
    httpClient(`/asset-lifecycle/jobs/${jobId}/start-work`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),

  /**
   * Technician resolves a job -> asset transitions MAINTENANCE -> OPERATIONAL
   */
  resolve: (jobId, resolutionNotes) =>
    httpClient(`/asset-lifecycle/jobs/${jobId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionNotes }),
    }),

  /**
   * Technician decommissions an asset -> asset transitions MAINTENANCE -> RETIRED
   */
  decommission: (jobId, reason) =>
    httpClient(`/asset-lifecycle/jobs/${jobId}/decommission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
};