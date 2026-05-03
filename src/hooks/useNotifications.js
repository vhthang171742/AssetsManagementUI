import { useState, useEffect, useCallback, useRef } from "react";
import { notificationService } from "services/notificationService";

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const BELL_PAGE_SIZE = 10;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [newestPage, unreadPage] = await Promise.all([
        notificationService.getMyNotifications({
          page: 1,
          pageSize: BELL_PAGE_SIZE,
        }),
        notificationService.getMyNotifications({
          unreadOnly: true,
          page: 1,
          pageSize: 1,
        }),
      ]);

      const items = newestPage?.items ?? [];
      setNotifications(items);
      setUnreadCount(unreadPage?.totalCount ?? 0);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const target = notifications.find((n) => n.notificationID === notificationId);
      if (target && !target.isRead) {
        await notificationService.markAsRead(notificationId);
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationID === notificationId ? { ...n, isRead: true } : n
        )
      );

      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("markAsRead failed:", err.message);
    }
  }, [notifications]);

  const dismissNotification = useCallback(async (notificationId) => {
    try {
      const target = notifications.find((n) => n.notificationID === notificationId);
      if (target && !target.isRead) {
        await notificationService.markAsRead(notificationId);
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      setNotifications((prev) => prev.filter((n) => n.notificationID !== notificationId));
    } catch (err) {
      console.error("dismissNotification failed:", err.message);
    }
  }, [notifications]);

  const markAllAsReadAndDismiss = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("markAllAsReadAndDismiss failed:", err.message);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetch,
    markAsRead,
    dismissNotification,
    markAllAsReadAndDismiss,
  };
}
