import React from "react";
import { useMsal } from "@azure/msal-react";
import { useLocation, useNavigate } from "react-router-dom";
import Dropdown from "components/dropdown";
import { FiAlignJustify, FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import avatarDefault from "assets/img/avatars/user.png";
import { RiMoonFill, RiSunFill } from "react-icons/ri";
import { MdClose, MdKeyboardArrowDown, MdOutlineNotificationsNone, MdWarningAmber, MdErrorOutline } from "react-icons/md";
import { IoMdNotificationsOutline } from "react-icons/io";
import { useAuth } from "context/AuthContext";
import { useLanguage } from "context/LanguageContext";
import LanguageSwitcher from "components/languageSwitcher/LanguageSwitcher";
import GlobalSearch from "components/navbar/GlobalSearch";
import { TranslationKeys as K } from "i18n/translationKeys";
import useNotifications from "hooks/useNotifications";

function severityIcon(severity) {
  switch ((severity || "").toLowerCase()) {
    case "warning":
      return <MdWarningAmber className="h-5 w-5 text-amber-500" />;
    case "error":
    case "critical":
      return <MdErrorOutline className="h-5 w-5 text-red-500" />;
    default:
      return <MdOutlineNotificationsNone className="h-5 w-5 text-brand-500" />;
  }
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function parseTimestamp(value) {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  if (typeof value === "string") {
    // Some APIs may return ISO without timezone suffix; treat as UTC fallback.
    const utcFallback = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
    const parsed = new Date(utcFallback);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
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

function NotificationDropdown({ t, language }) {
  const { notifications, unreadCount, loading, error, markAsRead, dismissNotification, markAllAsReadAndDismiss } = useNotifications();
  const navigate = useNavigate();
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const getTitle = (n) => n.title || n.typeCode || "";

  const formatTimestamp = React.useCallback((dateStr) => {
    const dt = parseTimestamp(dateStr);
    if (!dt) return "";

    const diffMs = nowMs - dt.getTime();
    const mins = Math.floor(Math.abs(diffMs) / 60_000);
    if (mins < 1) {
      return t(K.NAV_JUST_NOW, "just now");
    }
    if (mins < 60) {
      return t(K.NAV_MINS_AGO, "{count} mins ago").replace("{count}", String(mins));
    }

    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return t(K.NAV_HOURS_AGO, "{count} hours ago").replace("{count}", String(hours));
    }

    return dt.toLocaleString(language || undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [nowMs, language, t]);

  const getTargetPath = (n) => {
    const typeCode = String(n.typeCode || "").toUpperCase();
    const relatedType = String(n.relatedEntityType || "").toLowerCase();

    if (typeCode.startsWith("INCIDENT") || relatedType.includes("incident")) {
      return "/maintainer";
    }

    if (typeCode.startsWith("ATTENDANCE") || relatedType.includes("class") || relatedType.includes("attendance")) {
      return "/student";
    }

    return "/profile";
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.notificationID);
    }

    const path = getTargetPath(notification);
    if (path === "/profile") {
      navigate(path);
      return;
    }

    const dateKey = toDateKey(notification.triggeredAt);
    const query = dateKey ? `?date=${encodeURIComponent(dateKey)}&fromNotification=1` : "";
    navigate(`${path}${query}`);
  };

  return (
    <Dropdown
      button={
        <p className="relative cursor-pointer">
          <IoMdNotificationsOutline className="h-4 w-4 text-gray-600 dark:text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </p>
      }
      animation="origin-[65%_0%] md:origin-top-right transition-all duration-300 ease-in-out"
      classNames={"py-2 top-8 -left-[230px] md:-left-[440px] w-max"}
      children={
        <div className="flex w-[360px] flex-col gap-3 rounded-[20px] bg-white p-4 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none sm:w-[460px]">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-navy-700 dark:text-white">
              {t(K.NAV_NOTIFICATION, "Notification")}
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-300">
                  {unreadCount}
                </span>
              )}
            </p>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); markAllAsReadAndDismiss(); }}
                className="text-sm font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {t(K.NAV_MARK_ALL_AS_READ, "Mark all as read")}
              </button>
            )}
          </div>
          {loading ? (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              {t(K.NAV_NOTIFICATIONS_LOADING, "Loading notifications...")}
            </p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-400">
              {t(K.NAV_NOTIFICATIONS_ERROR, "Could not load notifications")}
            </p>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              {t(K.NAV_NO_NOTIFICATIONS, "You have no notifications")}
            </p>
          ) : (
            <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.notificationID}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationClick(n);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(n);
                    }
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-navy-600 ${n.isRead ? "opacity-60" : ""}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${n.isRead ? "bg-gray-100 dark:bg-navy-800" : "bg-gradient-to-b from-brandLinear to-brand-500"}`}>
                    <span className={n.isRead ? "" : "text-white"}>
                      {severityIcon(n.isRead ? null : n.severity)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {(() => {
                      const parsed = splitNotificationMessage(n.message);
                      return (
                        <>
                          <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                            {getTitle(n)}
                          </p>
                          {parsed.summary ? (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {parsed.summary}
                            </p>
                          ) : null}
                          {parsed.details.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {parsed.details.map((d, idx) => (
                                <span key={`${d.label}-${idx}`} className="rounded-md bg-lightPrimary px-1.5 py-0.5 text-[10px] font-medium text-navy-700 dark:bg-navy-800 dark:text-gray-200">
                                  <span className="font-semibold">{d.label}:</span> {d.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                            {formatTimestamp(n.triggeredAt)}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    aria-label={t(K.NAV_DISMISS_NOTIFICATION, "Dismiss notification")}
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.notificationID);
                    }}
                    className="mt-0.5 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-navy-500 dark:hover:text-gray-200"
                  >
                    <MdClose className="h-3.5 w-3.5" />
                  </button>
                  {!n.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/profile");
              }}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              {t(K.NAV_SHOW_ALL, "Show all")}
            </button>
          </div>
        </div>
      }
    />
  );
}

const Navbar = (props) => {
  const {
    onOpenSidenav,
    showSidebarToggle = true,
    profilePath = "/profile",
    onMobileSearchOpenChange,
    compact = false,
  } = props;
  const { isDarkMode, toggleDarkMode, userProfile, userPhoto, getAvailablePortals, selectedPortalId, setSelectedPortal } = useAuth();
  const { t, language } = useLanguage();
  const { instance } = useMsal();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: "/auth/sign-in" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const displayName = userProfile?.displayName || userProfile?.givenName || "User";
  const email = userProfile?.email || "user@example.com";
  const avatarUrl = userPhoto || avatarDefault;
  const availablePortals = getAvailablePortals();
  const hasPortalAccess = availablePortals.length > 0;
  const activePortal =
    availablePortals.find((portal) => location.pathname.startsWith(portal.path)) ||
    availablePortals.find((portal) => portal.id === selectedPortalId) ||
    availablePortals[0];
  const activePortalName = activePortal ? t(activePortal.translationKey, activePortal.name) : t(K.NAV_PORTAL, "Portal");
  const compactPortalLabel = activePortalName;

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 430 : false
  );
  const [isSmallScreen, setIsSmallScreen] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsVerySmallScreen(window.innerWidth < 430);
      setIsSmallScreen(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if ((showSidebarToggle && !isSmallScreen) || (!showSidebarToggle && !isVerySmallScreen)) {
      setSearchOpen(false);
    }
  }, [isVerySmallScreen, isSmallScreen, showSidebarToggle]);

  React.useEffect(() => {
    if (typeof onMobileSearchOpenChange === "function") {
      onMobileSearchOpenChange(searchOpen && isSmallScreen);
    }
  }, [searchOpen, isSmallScreen, onMobileSearchOpenChange]);

  const isAdminMobileSearchMode = showSidebarToggle && searchOpen && isSmallScreen;

  const handlePortalSwitch = (portal) => {
    setSelectedPortal(portal.id);
    navigate(portal.path, { replace: true });
  };

  return (
    <nav
      className={`z-30 w-full px-0 ${compact ? "h-full py-0" : "py-2"}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? "h-full min-h-0" : "min-h-[52px]"}`}>
        {showSidebarToggle && typeof onOpenSidenav === "function" ? (
          <button
            type="button"
            className={`cursor-pointer text-xl text-gray-600 dark:text-white ${searchOpen ? "hidden" : "flex"}`}
            onClick={onOpenSidenav}
            aria-label={t(K.NAV_OPEN_NAVIGATION, "Open navigation")}
          >
            <FiAlignJustify className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-0" />
        )}

        <div className={`flex min-w-0 w-full ${showSidebarToggle && !isAdminMobileSearchMode ? "justify-end" : ""}`}>
          <div className={`relative flex min-w-0 max-w-full items-center justify-end gap-1 rounded-[26px] bg-white px-2 py-1.5 shadow-xl shadow-shadow-500 dark:!bg-navy-800 dark:shadow-none sm:gap-1.5 ${showSidebarToggle ? "md:min-w-[430px] xl:min-w-[500px]" : "w-full"} ${isAdminMobileSearchMode ? "w-full" : ""}`}>
            {searchOpen ? (
              <div className="absolute inset-0 z-20 flex items-center gap-2 rounded-[26px] bg-white px-2 py-1.5 dark:!bg-navy-800 sm:hidden">
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white"
                  onClick={() => setSearchOpen(false)}
                  aria-label={t(K.NAV_CLOSE_SEARCH, "Close search")}
                >
                  <MdClose className="h-4 w-4" />
                </button>
                <GlobalSearch
                  className="min-w-0 flex-1"
                  inputClassName="w-full"
                  placeholder={t(K.NAV_SEARCH_PLACEHOLDER, "Search pages...")}
                  autoFocus
                  onClose={() => setSearchOpen(false)}
                />
              </div>
            ) : null}
            <GlobalSearch
              className={`min-w-0 ${showSidebarToggle ? "hidden sm:block w-[145px] md:w-[175px] xl:w-[210px]" : isVerySmallScreen ? "hidden" : "flex-1"}`}
              placeholder={t(K.NAV_SEARCH_PLACEHOLDER, "Search pages...")}
            />
            <button
              type="button"
              className={`h-9 w-9 items-center justify-center rounded-full bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white ${searchOpen ? "hidden" : showSidebarToggle ? "flex sm:hidden" : isVerySmallScreen ? "flex" : "hidden"}`}
              onClick={() => setSearchOpen(true)}
              aria-label={t(K.NAV_SEARCH, "Search")}
            >
              <FiSearch className="h-4 w-4 text-gray-400 dark:text-white" />
            </button>
            <div className={`ml-auto flex items-center gap-1 sm:gap-1.5 ${searchOpen ? "hidden sm:flex" : ""}`}>
              <NotificationDropdown t={t} language={language} />
              <div className="hidden sm:block">
                <LanguageSwitcher className="" />
              </div>
              <div className="sm:hidden">
                <LanguageSwitcher className="max-w-[64px]" />
              </div>
              {hasPortalAccess ? (
                <Dropdown
                  button={
                    <div className="flex cursor-pointer items-center gap-1 rounded-xl bg-lightPrimary px-2 py-2 text-xs font-medium text-navy-700 dark:bg-navy-900 dark:text-white sm:px-3">
                      <span className="hidden whitespace-nowrap sm:inline">{activePortalName}</span>
                      <span className="whitespace-nowrap sm:hidden">{compactPortalLabel}</span>
                      <MdKeyboardArrowDown className="h-4 w-4" />
                    </div>
                  }
                  animation="origin-[90%_0%] md:origin-top-right transition-all duration-300 ease-in-out"
                  classNames={"top-10 -left-24 w-max"}
                  children={
                    <div className="flex w-52 flex-col rounded-[16px] bg-white p-2 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
                      {availablePortals.map((portal) => {
                        const isActive = activePortal?.id === portal.id;
                        return (
                          <button
                            key={portal.id}
                            type="button"
                            onClick={() => handlePortalSwitch(portal)}
                            className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                              isActive
                                ? "bg-lightPrimary font-semibold text-navy-700 dark:bg-navy-600 dark:text-white"
                                : "text-gray-700 hover:bg-lightPrimary dark:text-gray-200 dark:hover:bg-navy-600"
                            }`}
                          >
                            <span className="whitespace-nowrap">{t(portal.translationKey, portal.name)}</span>
                          </button>
                        );
                      })}
                    </div>
                  }
                />
              ) : null}
              <div className="cursor-pointer text-gray-600" onClick={toggleDarkMode}>
                {isDarkMode ? (
                  <RiSunFill className="h-4 w-4 text-gray-600 dark:text-white" />
                ) : (
                  <RiMoonFill className="h-4 w-4 text-gray-600 dark:text-white" />
                )}
              </div>
              <Dropdown
                button={
                  <img
                    className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
                    src={avatarUrl}
                    alt={displayName}
                    onError={(e) => { e.target.src = avatarDefault; }}
                  />
                }
                children={
                  <div className="flex w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-navy-700 dark:text-white">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="h-px w-full bg-gray-200 dark:bg-white/20 " />
                    <div className="flex flex-col p-4">
                      <Link
                        to={profilePath}
                        className="text-sm text-gray-800 dark:text-white hover:dark:text-white"
                      >
                        {t(K.NAV_PROFILE_SETTINGS, "Profile Settings")}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="mt-3 text-sm font-medium text-red-500 transition duration-150 ease-out hover:text-red-600 hover:ease-in"
                      >
                        {t(K.NAV_LOG_OUT, "Log Out")}
                      </button>
                    </div>
                  </div>
                }
                classNames={"py-2 top-8 -left-[180px] w-max"}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
