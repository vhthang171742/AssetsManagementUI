import React, { useMemo, useCallback, useState } from "react";
import Calendar from "react-calendar";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "react-calendar/dist/Calendar.css";
import "assets/css/TrainingCalendarBoard.css";

// ── helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const formatDayLabel = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && value.includes(":")) {
    return value.slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Returns true when `item` (scheduleItem) is scheduled to run on `date`.
 * Backend encodes days as: dayBit = 1 << DayOfWeek  (Sunday=0 … Saturday=6)
 * which matches JS Date.prototype.getDay().
 */
const isScheduledOnDate = (item, date) => {
  if (!item.daysMask || !item.startDate || !item.endDate) return false;
  const key = toDateKey(date);
  const startKey = toDateKey(item.startDate);
  const endKey = toDateKey(item.endDate);
  if (!key || !startKey || !endKey) return false;
  if (key < startKey || key > endKey) return false;
  const dow = (date instanceof Date ? date : new Date(date)).getDay();
  return (item.daysMask & (1 << dow)) !== 0;
};

const getLessonsForDate = (item, date) => {
  const key = toDateKey(date);
  const byDate = (key && item.lessonsByDate && item.lessonsByDate[key]) || [];

  if (byDate.length > 0) {
    return byDate;
  }

  if (Array.isArray(item.lessons) && item.lessons.length > 0) {
    return item.lessons;
  }

  if (item.startTime && item.endTime) {
    return [
      {
        startTime: item.startTime,
        endTime: item.endTime,
        assetLabel: item.assetInfo || null,
        attendanceStatus: item.attendanceStatus || null,
      },
    ];
  }

  return [];
};

const lessonCountForDate = (item, date) => {
  if (!isScheduledOnDate(item, date)) {
    return 0;
  }

  const lessons = getLessonsForDate(item, date);
  return lessons.length > 0 ? lessons.length : 1;
};

// ── type → visual config ─────────────────────────────────────────────────────

const TYPE_CONFIG = {
  assignment: { accent: "#16a34a", bg: "#f0fdf4", badge: "Assignment", icon: "✦" },
  session:    { accent: "#d97706", bg: "#fffbeb", badge: "Session",    icon: "◉" },
  issue:      { accent: "#dc2626", bg: "#fef2f2", badge: "Incident",   icon: "!" },
};

const SCHEDULE_CONFIG = { accent: "#0891b2", bg: "#ecfeff" };

const resolveConfig = (event) =>
  TYPE_CONFIG[event.type] ||
  (event.color === "green" ? TYPE_CONFIG.assignment : TYPE_CONFIG.session);

// ── component ─────────────────────────────────────────────────────────────────

/**
 * @param {object[]} scheduleItems  – class schedule objects:
 *   { id, name, room, startDate, endDate, daysMask, startTime, endTime, assetInfo? }
 * @param {object[]} events         – point-in-time events:
 *   { date, type, label, subtitle? }
 */
export default function TrainingCalendarBoard({
  value,
  onChange,
  scheduleItems = [],
  events = [],
  title,
  detailsTitle,
  noEventsText,
  onForceReturn,
}) {
  const [expandedLessons, setExpandedLessons] = useState({});
  // ── event map (point-in-time: sessions, assignments, issues) ───────────────
  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const key = toDateKey(ev.date);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return map;
  }, [events]);

  // ── schedule: which dates have at least one active class? ──────────────────
  // We don't pre-expand all dates; instead the tileContent callback checks per tile.
  // But for the tileClassName (dot indicator) we need a fast lookup.
  // We mark a date as "has schedule" only in tileContent (cheap per-tile check).

  const today = toDateKey(new Date());
  const selectedDateKey = toDateKey(value);

  // Events for the selected day
  const selectedEvents = useMemo(
    () => (selectedDateKey ? eventMap.get(selectedDateKey) || [] : []),
    [eventMap, selectedDateKey]
  );

  const typeOrder = ["assignment", "session", "issue"];
  const sortedEvents = useMemo(
    () => [...selectedEvents].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedEvents]
  );

  const activeScheduleItems = useMemo(() => {
    if (!value) {
      return [];
    }

    return scheduleItems
      .filter((item) => isScheduledOnDate(item, value))
      .map((item) => ({
        ...item,
        dailyLessons: getLessonsForDate(item, value),
      }));
  }, [scheduleItems, value]);

  const isToday = selectedDateKey === today;
  const hasAnything = activeScheduleItems.length > 0 || sortedEvents.length > 0;

  const goDay = useCallback(
    (delta) => onChange && onChange(addDays(value || new Date(), delta)),
    [value, onChange]
  );

  const toggleLesson = useCallback((lessonKey) => {
    setExpandedLessons((prev) => ({
      ...prev,
      [lessonKey]: !prev[lessonKey],
    }));
  }, []);

  return (
    <div className="tcb">
      {/* ── Left: month calendar ───────────────────────────────────────── */}
      <div className="tcb__left">
        {title && <h3 className="tcb__title">{title}</h3>}

        <Calendar
          onChange={onChange}
          value={value}
          prevLabel={<MdChevronLeft className="tcb__nav-icon" />}
          nextLabel={<MdChevronRight className="tcb__nav-icon" />}
          prev2Label={null}
          next2Label={null}
          view="month"
          tileClassName={({ date, view }) => {
            if (view !== "month") return null;
            const key = toDateKey(date);
            const parts = [];
            if (key === today) parts.push("tcb__today-tile");
            return parts.join(" ") || null;
          }}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const key = toDateKey(date);

            const scheduleCount = scheduleItems.reduce(
              (sum, item) => sum + lessonCountForDate(item, date),
              0
            );
            const dayEvents = key ? (eventMap.get(key) || []) : [];
            const incidentCount = dayEvents.filter(ev => ev.type === "issue").length;
            const nonIncidentCount = dayEvents.filter(ev => ev.type !== "issue").length;
            const lessonCount = scheduleCount + nonIncidentCount;

            if (lessonCount <= 0 && incidentCount <= 0) return null;

            return (
              <div className="tcb__tile-dots">
                {lessonCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--lesson">{lessonCount}</span>}
                {incidentCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--incident">{incidentCount}</span>}
              </div>
            );
          }}
        />
      </div>

      {/* ── Right: day detail panel ────────────────────────────────────── */}
      <aside className="tcb__right">
        {/* Header */}
        <div className="tcb__right-header">
          <div className="tcb__right-header-text">
            <span className="tcb__right-label">
              {detailsTitle || "Daily details"}
              {isToday && <span className="tcb__today-badge">Today</span>}
            </span>
            <span className="tcb__right-date">
              {value ? formatDayLabel(value) : ""}
            </span>
          </div>
          <div className="tcb__day-nav">
            <button className="tcb__day-nav-btn" onClick={() => goDay(-1)} aria-label="Previous day">
              <MdChevronLeft />
            </button>
            <button className="tcb__day-nav-btn" onClick={() => goDay(1)} aria-label="Next day">
              <MdChevronRight />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="tcb__event-list">
          {!hasAnything ? (
            <div className="tcb__empty">
              <span className="tcb__empty-icon">📅</span>
              <p>{noEventsText || "No events scheduled for this day."}</p>
            </div>
          ) : (
            <>
              {/* ── Schedule cards (classes running today) ─────────────── */}
              {activeScheduleItems.map((item) => (
                <div
                  key={`sched-${item.id}`}
                  className="tcb__event-card"
                  style={{ "--accent": SCHEDULE_CONFIG.accent, "--bg": SCHEDULE_CONFIG.bg }}
                >
                  <span className="tcb__event-accent-bar" />
                  <div className="tcb__event-body">
                    <div className="tcb__event-top">
                      <span className="tcb__event-badge" style={{ color: SCHEDULE_CONFIG.accent }}>
                        Class
                      </span>
                    </div>
                    <p className="tcb__event-label">{item.courseName || item.name}</p>
                    {item.courseName && item.name && item.courseName !== item.name && (
                      <p className="tcb__event-subtitle">{item.name}</p>
                    )}
                    {item.room && <p className="tcb__event-subtitle">{item.room}</p>}

                    <div className="tcb__lesson-list">
                      {(item.dailyLessons || []).map((lesson, index) => (
                        <div key={`${item.id}-lesson-${index}`} className="tcb__lesson-block">
                          <button
                            type="button"
                            className={`tcb__lesson-row tcb__lesson-row--toggle${lesson.students?.length ? " is-clickable" : ""}`}
                            onClick={() => lesson.students?.length && toggleLesson(`${item.id}-${index}`)}
                            disabled={!lesson.students?.length}
                          >
                            {(lesson.startTime || lesson.endTime) && (
                              <span className="tcb__pill tcb__pill--time">
                                {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                              </span>
                            )}
                            {lesson.summaryLabel && (
                              <span className="tcb__pill tcb__pill--summary">{lesson.summaryLabel}</span>
                            )}
                            {lesson.assetLabel && (
                              <span className="tcb__pill tcb__pill--asset">{lesson.assetLabel}</span>
                            )}
                            {lesson.attendanceStatus && (
                              <span className={`tcb__pill tcb__pill--status tcb__pill--${lesson.attendanceStatus.toLowerCase()}`}>
                                {lesson.attendanceStatus}
                              </span>
                            )}
                            {lesson.students?.length ? (
                              <span className="tcb__lesson-expand-hint">
                                {expandedLessons[`${item.id}-${index}`] ? "Hide students" : "Show students"}
                              </span>
                            ) : null}
                          </button>

                          {lesson.students?.length && expandedLessons[`${item.id}-${index}`] ? (
                            <div className="tcb__student-list">
                              {lesson.students.map((student) => (
                                <div key={`${item.id}-${index}-${student.studentID}`} className="tcb__student-row">
                                  <span className="tcb__student-name">
                                    {student.name || `Student #${student.studentID}`}
                                  </span>
                                  {student.assetLabel ? (
                                    <span className="tcb__pill tcb__pill--asset">{student.assetLabel}</span>
                                  ) : null}
                                  {student.attendanceStatus ? (
                                    <span className={`tcb__pill tcb__pill--status tcb__pill--${student.attendanceStatus.toLowerCase()}`}>
                                      {student.attendanceStatus}
                                    </span>
                                  ) : null}
                                  {onForceReturn && student.assignmentId ? (
                                    <button
                                      type="button"
                                      className="tcb__student-action"
                                      onClick={() => onForceReturn(student.assignmentId)}
                                    >
                                      Force Return
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Point-in-time event cards (sessions, issues, etc.) ──── */}
              {sortedEvents.map((event, i) => {
                const cfg = resolveConfig(event);
                return (
                  <div
                    key={`ev-${i}`}
                    className="tcb__event-card"
                    style={{ "--accent": cfg.accent, "--bg": cfg.bg }}
                  >
                    <span className="tcb__event-accent-bar" />
                    <div className="tcb__event-body">
                      <div className="tcb__event-top">
                        <span className="tcb__event-badge" style={{ color: cfg.accent }}>
                          {cfg.icon} {cfg.badge}
                        </span>
                      </div>
                      <p className="tcb__event-label">{event.label}</p>
                      {event.subtitle && (
                        <p className="tcb__event-subtitle">{event.subtitle}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

