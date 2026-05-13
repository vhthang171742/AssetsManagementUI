import React, { useMemo, useCallback, useState } from "react";
import Calendar from "react-calendar";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "react-calendar/dist/Calendar.css";
import "assets/css/TrainingCalendarBoard.css";
import Modal from "components/modal/Modal";
import RoomPill from "components/RoomPill";
import {
  formatTimeInTimeZone,
  toDateKeyInTimeZone,
  utcClockTimeToTimeZone,
} from "services/dateTimeService";
import EntityPill from "components/EntityPill";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

// ── helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (value, timeZoneId) => toDateKeyInTimeZone(value, timeZoneId);

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const formatDayLabel = (date, timeZoneId) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timeZoneId || undefined,
  });

const formatTime = (value, timeZoneId, referenceDate) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Full timestamp (ISO/API) should be formatted directly in the target timezone.
    if (trimmed.includes("T") || trimmed.endsWith("Z") || /[+\-]\d{2}:\d{2}$/.test(trimmed)) {
      return formatTimeInTimeZone(trimmed, timeZoneId);
    }

    // Clock-only strings from class schedules are stored as UTC clock time.
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return utcClockTimeToTimeZone(trimmed, timeZoneId, referenceDate);
    }
  }

  return formatTimeInTimeZone(value, timeZoneId);
};

/**
 * Returns true when `item` (scheduleItem) is scheduled to run on `date`.
 * Backend encodes days as: dayBit = 1 << DayOfWeek  (Sunday=0 … Saturday=6)
 * which matches JS Date.prototype.getDay().
 */
const isScheduledOnDate = (item, date, timeZoneId) => {
  if (!item.daysMask || !item.startDate || !item.endDate) return false;
  const key = toDateKey(date, timeZoneId);
  const startKey = toDateKey(item.startDate, timeZoneId);
  const endKey = toDateKey(item.endDate, timeZoneId);
  if (!key || !startKey || !endKey) return false;
  if (key < startKey || key > endKey) return false;
  const dow = (date instanceof Date ? date : new Date(date)).getDay();
  return (item.daysMask & (1 << dow)) !== 0;
};

const getLessonsForDate = (item, date, timeZoneId) => {
  const key = toDateKey(date, timeZoneId);
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

const lessonCountForDate = (item, date, timeZoneId) => {
  if (!isScheduledOnDate(item, date, timeZoneId)) {
    return 0;
  }

  const lessons = getLessonsForDate(item, date, timeZoneId);
  return lessons.length > 0 ? lessons.length : 1;
};

// ── type → visual config ─────────────────────────────────────────────────────

const TYPE_CONFIG = {
  assignment: { accent: "#16a34a", bg: "#f0fdf4", icon: "✦" },
  session:    { accent: "#d97706", bg: "#fffbeb", icon: "◉" },
  issue:      { accent: "#dc2626", bg: "#fef2f2", icon: "!" },
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
  onActiveMonthChange,
  scheduleItems = [],
  events = [],
  timeZoneId,
  title,
  detailsTitle,
  noEventsText,
  onForceReturn,
  renderLessonActions,
  renderStudentActions,
  buildLessonAssetModalData,
  buildStudentAssetModalData,
  scheduleBadgeLabel,
  renderEventCard,
  footerContent,
}) {
  const { t } = useLanguage();
  const [studentModalState, setStudentModalState] = useState(null);
  // ── event map (point-in-time: sessions, assignments, issues) ───────────────
  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const key = toDateKey(ev.date, timeZoneId);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return map;
  }, [events, timeZoneId]);

  // ── schedule: which dates have at least one active class? ──────────────────
  // We don't pre-expand all dates; instead the tileContent callback checks per tile.
  // But for the tileClassName (dot indicator) we need a fast lookup.
  // We mark a date as "has schedule" only in tileContent (cheap per-tile check).

  const today = toDateKey(new Date(), timeZoneId);
  const selectedDateKey = toDateKey(value, timeZoneId);

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
      .filter((item) => isScheduledOnDate(item, value, timeZoneId))
      .map((item) => ({
        ...item,
        dailyLessons: getLessonsForDate(item, value, timeZoneId),
      }));
  }, [scheduleItems, value, timeZoneId]);

  const isToday = selectedDateKey === today;
  const hasAnything = activeScheduleItems.length > 0 || sortedEvents.length > 0;

  const goDay = useCallback(
    (delta) => onChange && onChange(addDays(value || new Date(), delta)),
    [value, onChange]
  );

  const openStudentsModal = useCallback((payload) => {
    setStudentModalState(payload);
  }, []);

  const closeStudentsModal = useCallback(() => {
    setStudentModalState(null);
  }, []);

  const eventBadgeByType = useMemo(
    () => ({
      assignment: t(K.CALENDAR_BADGE_ASSIGNMENT, "Assignment"),
      session: t(K.CALENDAR_BADGE_SESSION, "Session"),
      issue: t(K.CALENDAR_BADGE_INCIDENT, "Incident"),
    }),
    [t]
  );

  const getSerialLabel = useCallback(
    (serialNumber) => (serialNumber ? `SN ${serialNumber}` : null),
    []
  );

  const renderStudentRow = useCallback((student, context) => {
    const extraModalData = student.assetID && buildStudentAssetModalData
      ? buildStudentAssetModalData({
          ...context,
          student,
          selectedDate: value,
        })
      : null;

    return (
      <div
        key={`${context.item.id}-${context.lessonIndex}-${student.studentID || student.studentCode || student.name}`}
        className="tcb__student-row"
      >
        <span className="tcb__student-name">
          {student.studentID ? (
            <EntityPill
              type="student"
              id={student.studentID}
              label={student.studentCode || student.name || student.fullName || t(K.TEACHER_STUDENT_LABEL, "Student")}
            />
          ) : (
            student.studentCode || student.name || student.fullName || t(K.TEACHER_STUDENT_LABEL, "Student")
          )}
        </span>
        {student.assetLabel && !student.assetID ? (
          <span className="tcb__pill tcb__pill--asset">{student.assetLabel}</span>
        ) : null}
        {student.assetID ? (
          <EntityPill
            type="asset"
            id={student.assetID}
            label={getSerialLabel(student.serialNumber) || student.assetCode || student.assetLabel}
            modalData={{
              serialNumber: student.serialNumber || null,
              assetStatus: student.assetStatus || null,
              ...(extraModalData || {}),
            }}
          />
        ) : null}
        {student.attendanceStatus ? (
          <span className={`tcb__pill tcb__pill--status tcb__pill--${student.attendanceStatus.toLowerCase()}`}>
            {student.attendanceStatus}
          </span>
        ) : null}
        {onForceReturn && student.assignmentId && student.isCheckedOut ? (
          <button
            type="button"
            className="tcb__student-action"
            onClick={() => onForceReturn(student.assignmentId)}
          >
            {t(K.TEACHER_FORCE_RETURN, "Force Return")}
          </button>
        ) : null}
        {renderStudentActions
          ? renderStudentActions({
              ...context,
              student,
              selectedDate: value,
            })
          : null}
      </div>
    );
  }, [buildStudentAssetModalData, getSerialLabel, onForceReturn, renderStudentActions, t, value]);

  return (
    <div className="tcb">
      {/* ── Left: month calendar ───────────────────────────────────────── */}
      <div className="tcb__left">
        {title && <h3 className="tcb__title">{title}</h3>}

        <Calendar
          onChange={onChange}
          onActiveStartDateChange={({ activeStartDate, view }) => {
            if (view === "month" && activeStartDate && onActiveMonthChange) {
              onActiveMonthChange(activeStartDate);
            }
          }}
          value={value}
          prevLabel={<MdChevronLeft className="tcb__nav-icon" />}
          nextLabel={<MdChevronRight className="tcb__nav-icon" />}
          prev2Label={null}
          next2Label={null}
          view="month"
          tileClassName={({ date, view }) => {
            if (view !== "month") return null;
            const key = toDateKey(date, timeZoneId);
            const parts = [];
            const hasSchedule = scheduleItems.some((item) => lessonCountForDate(item, date, timeZoneId) > 0);
            if (hasSchedule) {
              parts.push("tcb__schedule-tile");
              if (key && key < today) {
                parts.push("tcb__schedule-tile--past");
              }
            }
            if (key === today) parts.push("tcb__today-tile");
            return parts.join(" ") || null;
          }}
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const key = toDateKey(date, timeZoneId);

            const scheduleCount = scheduleItems.reduce(
              (sum, item) => sum + lessonCountForDate(item, date, timeZoneId),
              0
            );
            const dayEvents = key ? (eventMap.get(key) || []) : [];
            const incidentEvents = dayEvents.filter(ev => ev.type === "issue");
            const pendingCount = incidentEvents.filter(ev => ev.statusGroup === "pending").length;
            const inProgressCount = incidentEvents.filter(ev => ev.statusGroup === "in-progress").length;
            const otherIncidentCount = incidentEvents.filter(ev => !ev.statusGroup || !["pending", "in-progress"].includes(ev.statusGroup)).length;
            const nonIncidentCount = dayEvents.filter(ev => ev.type !== "issue").length;
            const lessonCount = scheduleCount + nonIncidentCount;

            if (lessonCount <= 0 && incidentEvents.length <= 0) return null;

            return (
              <div className="tcb__tile-dots">
                {lessonCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--lesson">{lessonCount}</span>}
                {pendingCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--pending">{pendingCount}</span>}
                {inProgressCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--in-progress">{inProgressCount}</span>}
                {otherIncidentCount > 0 && <span className="tcb__tile-dot tcb__tile-dot--incident">{otherIncidentCount}</span>}
              </div>
            );
          }}
        />
        {footerContent && <div className="tcb__footer">{footerContent}</div>}
      </div>

      {/* ── Right: day detail panel ────────────────────────────────────── */}
      <aside className="tcb__right">
        {/* Header */}
        <div className="tcb__right-header">
          <div className="tcb__right-header-text">
            <span className="tcb__right-label">
              {detailsTitle || t(K.COMMON_DAILY_DETAILS, "Daily Details")}
              {isToday && <span className="tcb__today-badge">{t(K.CALENDAR_TODAY, "Today")}</span>}
            </span>
            <span className="tcb__right-date">
              {value ? formatDayLabel(value, timeZoneId) : ""}
            </span>
          </div>
          <div className="tcb__day-nav">
            <button className="tcb__day-nav-btn" onClick={() => goDay(-1)} aria-label={t(K.CALENDAR_PREVIOUS_DAY, "Previous day")}>
              <MdChevronLeft />
            </button>
            <button className="tcb__day-nav-btn" onClick={() => goDay(1)} aria-label={t(K.CALENDAR_NEXT_DAY, "Next day")}>
              <MdChevronRight />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="tcb__event-list">
          {!hasAnything ? (
            <div className="tcb__empty">
              <span className="tcb__empty-icon">📅</span>
              <p>{noEventsText || t(K.CALENDAR_NO_EVENTS_FOR_DAY, "No events scheduled for this day.")}</p>
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
                        {scheduleBadgeLabel || t(K.CALENDAR_BADGE_CLASS, "Class")}
                      </span>
                      {item.classCode ? (
                        <EntityPill type="class" id={item.id} label={item.classCode} />
                      ) : null}
                    </div>
                    <p className="tcb__event-label">{item.courseName || item.name}</p>
                    {item.courseName && item.name && item.courseName !== item.name && (
                      <p className="tcb__event-subtitle">{item.name}</p>
                    )}
                    {item.room && (
                      <div className="tcb__event-subtitle">
                        <RoomPill roomId={item.roomID || null} label={item.room} roomName={item.room} />
                      </div>
                    )}

                    <div className="tcb__lesson-list">
                      {(item.dailyLessons || []).map((lesson, index) => (
                        <div key={`${item.id}-lesson-${index}`} className="tcb__lesson-block">
                          <div className="tcb__lesson-row-wrap" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                            <button
                              type="button"
                              className={`tcb__lesson-row tcb__lesson-row--toggle${lesson.students?.length ? " is-clickable" : ""}`}
                              onClick={() => lesson.students?.length && openStudentsModal({
                                item,
                                lesson,
                                lessonIndex: index,
                                lessonKey: `${item.id}-${index}`,
                              })}
                              disabled={!lesson.students?.length}
                              style={{ display: "contents" }}
                            >
                              {(lesson.startTime || lesson.endTime) && (
                                <span className="tcb__pill tcb__pill--time">
                                  {formatTime(lesson.startTime, timeZoneId, value)}-{formatTime(lesson.endTime, timeZoneId, value)}
                                </span>
                              )}
                              {lesson.summaryLabel && (
                                <span className="tcb__pill tcb__pill--summary">{lesson.summaryLabel}</span>
                              )}
                              {lesson.assetLabel && !lesson.assetID && (
                                <span className="tcb__pill tcb__pill--asset">{lesson.assetLabel}</span>
                              )}
                              {lesson.attendanceStatus && (
                                <span className={`tcb__pill tcb__pill--status tcb__pill--${lesson.attendanceStatus.toLowerCase()}`}>
                                  {lesson.attendanceStatus}
                                </span>
                              )}
                              {lesson.students?.length ? (
                                <span className="tcb__lesson-expand-hint">
                                  {t(K.CALENDAR_SHOW_STUDENTS, "Show students")}
                                </span>
                              ) : null}
                            </button>
                            {lesson.assetID && (
                              <EntityPill
                                type="asset"
                                id={lesson.assetID}
                                label={getSerialLabel(lesson.serialNumber) || lesson.assetCode || lesson.assetLabel}
                                modalData={{
                                  serialNumber: lesson.serialNumber || null,
                                  assetStatus: lesson.assetStatus || null,
                                  ...(buildLessonAssetModalData
                                    ? buildLessonAssetModalData({
                                        item,
                                        lesson,
                                        lessonIndex: index,
                                        lessonKey: `${item.id}-${index}`,
                                        selectedDate: value,
                                      })
                                    : {}),
                                }}
                              />
                            )}
                          </div>

                          {renderLessonActions
                            ? renderLessonActions({
                                item,
                                lesson,
                                lessonIndex: index,
                                lessonKey: `${item.id}-${index}`,
                                selectedDate: value,
                              })
                            : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Point-in-time event cards (sessions, issues, etc.) ──── */}
              {sortedEvents.map((event, i) => {
                if (renderEventCard) {
                  const custom = renderEventCard(event, i);
                  if (custom) return <React.Fragment key={`ev-${i}`}>{custom}</React.Fragment>;
                }
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
                          {cfg.icon} {eventBadgeByType[event.type] || event.type}
                        </span>
                        {event.time && (
                          <span className="tcb__pill tcb__pill--time">{event.time}</span>
                        )}
                      </div>
                      <p className="tcb__event-label">{event.label}</p>
                      {event.subtitle && (
                        <p className="tcb__event-subtitle">{event.subtitle}</p>
                      )}
                      {event.category && (
                        <span className="tcb__pill tcb__pill--summary" style={{ marginTop: "4px", display: "inline-block" }}>
                          {event.category}
                        </span>
                      )}
                      {event.reporter && (
                        <p className="tcb__event-subtitle">{event.reporter}</p>
                      )}
                      {event.room && (
                        <p className="tcb__event-subtitle">{event.room}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      <Modal
        isOpen={Boolean(studentModalState)}
        onClose={closeStudentsModal}
        title={studentModalState
          ? `${t(K.CALENDAR_SHOW_STUDENTS, "Show students")} · ${studentModalState.item.classCode || studentModalState.item.courseName || studentModalState.item.name}`
          : t(K.CALENDAR_SHOW_STUDENTS, "Show students")}
        maxWidth="max-w-3xl"
        footer={(
          <button
            type="button"
            onClick={closeStudentsModal}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {t(K.MODAL_CLOSE, "Close")}
          </button>
        )}
      >
        {studentModalState ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-navy-900">
              <p className="font-semibold text-navy-700 dark:text-white">
                {studentModalState.item.courseName || studentModalState.item.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(studentModalState.lesson.startTime || studentModalState.lesson.endTime) && (
                  <span className="tcb__pill tcb__pill--time">
                    {formatTime(studentModalState.lesson.startTime, timeZoneId, value)}-{formatTime(studentModalState.lesson.endTime, timeZoneId, value)}
                  </span>
                )}
                {studentModalState.lesson.summaryLabel && (
                  <span className="tcb__pill tcb__pill--summary">{studentModalState.lesson.summaryLabel}</span>
                )}
              </div>
            </div>

            <div className="tcb__student-modal-list">
              {(studentModalState.lesson.students || []).map((student) =>
                renderStudentRow(student, {
                  item: studentModalState.item,
                  lesson: studentModalState.lesson,
                  lessonIndex: studentModalState.lessonIndex,
                  lessonKey: studentModalState.lessonKey,
                })
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

