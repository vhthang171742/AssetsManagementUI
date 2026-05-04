import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "components/card";
import avatarDefault from "assets/img/avatars/user.png";
import { useAuth } from "context/AuthContext";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { notificationService } from "services/notificationService";
import { updateMyTimezone, getCurrentUser } from "services/userService";

// Curated list of common IANA timezone IDs with human-readable labels.
const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (UTC+00:00)" },
  { value: "Europe/London", label: "London (UTC+00:00 / +01:00)" },
  { value: "Europe/Paris", label: "Paris / Berlin (UTC+01:00 / +02:00)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+04:00)" },
  { value: "Asia/Karachi", label: "Karachi (UTC+05:00)" },
  { value: "Asia/Kolkata", label: "India (UTC+05:30)" },
  { value: "Asia/Dhaka", label: "Dhaka (UTC+06:00)" },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+07:00)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (UTC+07:00)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+08:00)" },
  { value: "Asia/Shanghai", label: "Shanghai / Beijing (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+09:00)" },
  { value: "Asia/Seoul", label: "Seoul (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10:00 / +11:00)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12:00 / +13:00)" },
  { value: "America/Sao_Paulo", label: "São Paulo (UTC-03:00)" },
  { value: "America/New_York", label: "New York (UTC-05:00 / -04:00)" },
  { value: "America/Chicago", label: "Chicago (UTC-06:00 / -05:00)" },
  { value: "America/Denver", label: "Denver (UTC-07:00 / -06:00)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-08:00 / -07:00)" },
  { value: "America/Anchorage", label: "Anchorage (UTC-09:00)" },
  { value: "Pacific/Honolulu", label: "Honolulu (UTC-10:00)" },
];

const PAGE_SIZE = 10;

function toDateKey(value) {
  const date = parseTimestamp(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseTimestamp(value) {
  if (!value) return null;

  if (typeof value === "string") {
    // Some APIs may return ISO without timezone suffix; treat those as UTC first.
    if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(value)) {
      const parsedUtc = new Date(`${value}Z`);
      if (!Number.isNaN(parsedUtc.getTime())) {
        return parsedUtc;
      }
    }
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  return null;
}

const KNOWN_KEYS = [
  "Room", "Reporter", "Asset", "Class", "Student",
  "Phong", "Nguoi bao cao", "Tai san", "Lop", "Hoc vien",
];

function splitNotificationMessage(message) {
  const text = String(message || "").trim();
  if (!text) return { summary: "", details: [] };

  const keyPattern = KNOWN_KEYS.map((k) => k.replace(/ /g, "\\s+")).join("|");
  const metaRegex = new RegExp(`(${keyPattern}):\\s*([^;]+?)(?=\\s*(?:;|$))`, "gi");

  const details = [];
  let m;
  while ((m = metaRegex.exec(text)) !== null) {
    details.push({ label: m[1].trim(), value: m[2].trim().replace(/\.+$/, "") });
  }

  const firstKey = new RegExp(`(?:${keyPattern})\\s*:`, "i").exec(text);
  const summaryRaw = firstKey ? text.slice(0, firstKey.index) : text;
  const summary = summaryRaw.replace(/[.;,]+\s*$/, "").trim();

  return { summary, details };
}

function getTargetPath(item) {
  const typeCode = String(item.typeCode || "").toUpperCase();
  const relatedType = String(item.relatedEntityType || "").toLowerCase();

  if (typeCode.startsWith("INCIDENT") || relatedType.includes("incident")) {
    return "/maintainer";
  }
  if (typeCode.startsWith("ATTENDANCE") || relatedType.includes("class") || relatedType.includes("attendance")) {
    return "/student";
  }
  return "/profile";
}

function formatTimestamp(value, language, t, nowMs, timeZoneId) {
  const date = parseTimestamp(value);
  if (!date) return "";

  const diffMs = nowMs - date.getTime();
  const mins = Math.floor(Math.abs(diffMs) / 60000);
  if (mins < 1) return t(K.NAV_JUST_NOW, "just now");
  if (mins < 60) {
    return t(K.NAV_MINS_AGO, "{count} mins ago").replace("{count}", String(mins));
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return t(K.NAV_HOURS_AGO, "{count} hours ago").replace("{count}", String(hours));
  }

  return date.toLocaleString(language || undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZoneId || undefined,
  });
}

const ProfileOverview = () => {
  const { userProfile, userPhoto, getAvailablePortals, currentUser, setCurrentUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  // Timezone state
  const [selectedTz, setSelectedTz] = React.useState(currentUser?.timeZoneId || "");
  const [tzSaving, setTzSaving] = React.useState(false);
  const [tzMessage, setTzMessage] = React.useState(null); // { type: "success"|"error", text: string }

  // Sync selectedTz if currentUser changes (e.g. after refresh)
  React.useEffect(() => {
    if (currentUser?.timeZoneId) {
      setSelectedTz(currentUser.timeZoneId);
    }
  }, [currentUser?.timeZoneId]);

  const handleSaveTimezone = async () => {
    if (!selectedTz) return;
    setTzSaving(true);
    setTzMessage(null);
    try {
      await updateMyTimezone(selectedTz);
      // Refresh currentUser from backend so the new timezone propagates
      const refreshed = await getCurrentUser();
      if (refreshed) setCurrentUser(refreshed);
      setTzMessage({ type: "success", text: t(K.PROFILE_TIMEZONE_SAVED, "Timezone saved!") });
    } catch {
      setTzMessage({ type: "error", text: t(K.PROFILE_TIMEZONE_ERROR, "Failed to save timezone") });
    } finally {
      setTzSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const portals = getAvailablePortals();
  const displayName = userProfile?.displayName || userProfile?.givenName || "User";
  const avatarUrl = userPhoto || avatarDefault;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await notificationService.getMyNotifications({
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;

        setItems(response?.items || []);
        setTotalCount(response?.totalCount || 0);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load notifications");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleNotificationClick = async (item) => {
    try {
      if (!item.isRead) {
        await notificationService.markAsRead(item.notificationID);
        setItems((prev) => prev.map((x) => (
          x.notificationID === item.notificationID ? { ...x, isRead: true } : x
        )));
      }
    } catch {
      // Navigation should still continue even when mark-as-read fails.
    }

    const path = getTargetPath(item);
    if (path === "/profile") {
      return;
    }

    const dateKey = toDateKey(item.triggeredAt);
    const query = dateKey ? `?date=${encodeURIComponent(dateKey)}&fromNotification=1` : "";
    navigate(`${path}${query}`);
  };

  return (
    <div className="mt-3 flex w-full flex-col gap-5">
      <Card extra="w-full p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <img
            className="h-20 w-20 rounded-full object-cover"
            src={avatarUrl}
            alt={displayName}
            onError={(e) => {
              e.target.src = avatarDefault;
            }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-2xl font-bold text-navy-700 dark:text-white">
              {displayName}
            </h4>
            <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
              {t(K.PROFILE_ASSIGNED_PORTALS, "Assigned portal access")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {portals.length > 0 ? (
                portals.map((portal) => (
                  <span
                    key={portal.id}
                    className="rounded-full bg-lightPrimary px-3 py-1 text-xs font-semibold text-navy-700 dark:bg-navy-700 dark:text-white"
                  >
                    {t(portal.translationKey, portal.name)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t(K.PROFILE_NO_PORTAL_ACCESS, "No portal access assigned")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Timezone Settings */}
      <Card extra="w-full p-6">
        <h4 className="mb-4 text-xl font-bold text-navy-700 dark:text-white">
          {t(K.PROFILE_TIMEZONE_SETTINGS, "Timezone Settings")}
        </h4>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t(K.PROFILE_TIMEZONE_LABEL, "Your Timezone")}
            </label>
            <select
              value={selectedTz}
              onChange={(e) => { setSelectedTz(e.target.value); setTzMessage(null); }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-white/20 dark:bg-navy-900 dark:text-white"
            >
              <option value="">{t(K.PROFILE_TIMEZONE_PLACEHOLDER, "Select your timezone...")}</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedTz || tzSaving}
            onClick={handleSaveTimezone}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tzSaving
              ? t(K.PROFILE_TIMEZONE_SAVING, "Saving...")
              : t(K.PROFILE_TIMEZONE_SAVE, "Save Timezone")}
          </button>
        </div>
        {tzMessage && (
          <p className={`mt-2 text-sm font-medium ${tzMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {tzMessage.text}
          </p>
        )}
      </Card>

      <Card extra="w-full p-6">
        <div className="flex items-center">
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            {t(K.PROFILE_NOTIFICATION_HISTORY, "Notification history")}
          </h4>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t(K.PROFILE_LOADING_NOTIFICATIONS, "Loading notifications...")}
          </p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-500">
            {t(K.PROFILE_FAILED_NOTIFICATIONS, "Failed to load notifications")}: {error}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t(K.PROFILE_NOTIFICATION_EMPTY, "No notifications")}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.notificationID}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(item);
                  }
                }}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:bg-gray-50 dark:border-white/10 dark:bg-navy-900 dark:hover:bg-navy-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {(() => {
                      const parsed = splitNotificationMessage(item.message);
                      return (
                        <>
                          <p className="text-sm font-bold text-navy-700 dark:text-white">
                            {item.title || item.typeCode}
                          </p>
                          {parsed.summary ? (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {parsed.summary}
                            </p>
                          ) : null}
                          {parsed.details.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {parsed.details.map((d, idx) => (
                                <span key={`${d.label}-${idx}`} className="rounded-md bg-lightPrimary px-2 py-1 text-xs font-medium text-navy-700 dark:bg-navy-700 dark:text-gray-200">
                                  <span className="font-semibold">{d.label}:</span> {d.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(item.triggeredAt, language, t, nowMs, currentUser?.timeZoneId)}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                      item.isRead
                        ? "bg-gray-100 text-gray-600 dark:bg-navy-700 dark:text-gray-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {item.isRead
                      ? t(K.PROFILE_READ, "Read")
                      : t(K.PROFILE_UNREAD, "Unread")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t(K.PROFILE_PAGE_INFO, "Page {page} of {totalPages}")
              .replace("{page}", String(page))
              .replace("{totalPages}", String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white"
            >
              {t(K.PROFILE_PREVIOUS, "Previous")}
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white"
            >
              {t(K.PROFILE_NEXT, "Next")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileOverview;

