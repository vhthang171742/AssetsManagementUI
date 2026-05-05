import { httpClient } from "./httpClient";

export const workerCalendarService = {
  getGlobalConfig: () => httpClient("/worker-calendar/config"),

  updateGlobalConfig: (data) =>
    httpClient("/worker-calendar/config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getOverrides: (workerId) => {
    const query = workerId ? `?workerId=${encodeURIComponent(workerId)}` : "";
    return httpClient(`/worker-calendar/overrides${query}`);
  },

  upsertOverride: (data) =>
    httpClient("/worker-calendar/overrides", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteOverride: (workerId, startDate) =>
    httpClient(
      `/worker-calendar/overrides?workerId=${encodeURIComponent(workerId)}&startDate=${encodeURIComponent(startDate)}`,
      {
        method: "DELETE",
      }
    ),

  getMyCalendar: (year, month) =>
    httpClient(`/worker-calendar/me/calendar?year=${year}&month=${month}`),

  checkinByQr: (qrCodeValue) =>
    httpClient("/worker-calendar/me/checkin-by-qr", {
      method: "POST",
      body: JSON.stringify({ qrCodeValue }),
    }),

  checkoutByQr: (qrCodeValue) =>
    httpClient("/worker-calendar/me/checkout-by-qr", {
      method: "POST",
      body: JSON.stringify({ qrCodeValue }),
    }),
};
