import { httpClient } from "./httpClient";

export const notificationService = {
  getMyNotifications: (query = {}) => {
    const params = new URLSearchParams();
    if (query.unreadOnly != null) params.set("UnreadOnly", String(query.unreadOnly));
    if (query.page != null) params.set("Page", String(query.page));
    if (query.pageSize != null) params.set("PageSize", String(query.pageSize));
    const qs = params.toString();
    return httpClient(`/notifications/me${qs ? `?${qs}` : ""}`);
  },

  markAsRead: (notificationId) =>
    httpClient(`/notifications/me/${notificationId}/read`, { method: "POST" }),

  markAllAsRead: () =>
    httpClient("/notifications/me/read-all", { method: "POST" }),
};
