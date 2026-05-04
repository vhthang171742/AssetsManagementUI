import { useState, useEffect, useCallback, useRef } from "react";
import { notificationService } from "services/notificationService";
import { useAuth } from "context/AuthContext";

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const BELL_PAGE_SIZE = 10;
const DISMISSED_STORAGE_PREFIX = "am.dismissedNotifications";
const MAX_DISMISSED_IDS = 500;

function loadDismissedIds(storageKey) {
  if (!storageKey || typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
  } catch {
    return new Set();
  }
}

function persistDismissedIds(storageKey, idsSet) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  const values = Array.from(idsSet).slice(-MAX_DISMISSED_IDS);
  window.localStorage.setItem(storageKey, JSON.stringify(values));
}

export default function useNotifications() {
  const { currentUser, user } = useAuth();
  const storageKey = `${DISMISSED_STORAGE_PREFIX}.${currentUser?.userID || user?.id || "anonymous"}`;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => loadDismissedIds(storageKey));
  const timerRef = useRef(null);
  const dismissedIdsRef = useRef(dismissedIds);

  useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);

  useEffect(() => {
    const loaded = loadDismissedIds(storageKey);
    setDismissedIds(loaded);
    dismissedIdsRef.current = loaded;
  }, [storageKey]);

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
      const visibleItems = items.filter(
        (item) => !dismissedIdsRef.current.has(item.notificationID)
      );
      setNotifications(visibleItems);
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
  }, [fetch, storageKey]);

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

      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(notificationId);
        persistDismissedIds(storageKey, next);
        dismissedIdsRef.current = next;
        return next;
      });

      setNotifications((prev) => prev.filter((n) => n.notificationID !== notificationId));
    } catch (err) {
      console.error("dismissNotification failed:", err.message);
    }
  }, [notifications, storageKey]);

  const markAllAsReadAndDismiss = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      setDismissedIds((prev) => {
        const next = new Set(prev);
        notifications.forEach((n) => {
          next.add(n.notificationID);
        });
        persistDismissedIds(storageKey, next);
        dismissedIdsRef.current = next;
        return next;
      });

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("markAllAsReadAndDismiss failed:", err.message);
    }
  }, [notifications, storageKey]);

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
