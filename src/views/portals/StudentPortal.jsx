import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Card from "components/card";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import PortalLayout from "layouts/portal";
import {
  studentEquipmentAssignmentService,
  practiceSessionService,
  practiceErrorLogService,
  classService,
  courseService,
} from "services/api";
import { getCurrentUser } from "services/userService";
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import {
  formatDateTimeInTimeZone,
  formatTimeInTimeZone,
  parseApiDateTime,
  toDateKeyInTimeZone,
  utcClockTimeToTimeZone,
} from "services/dateTimeService";

const CLOCK_TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

const parseClockMinutes = (value) => {
  if (!value) {
    return null;
  }

  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const getMinutesInTimeZone = (value, timeZoneId, referenceDate) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && CLOCK_TIME_REGEX.test(value.trim())) {
    return parseClockMinutes(utcClockTimeToTimeZone(value.trim(), timeZoneId, referenceDate));
  }

  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return null;
  }

  return parseClockMinutes(formatTimeInTimeZone(parsed, timeZoneId));
};

export default function StudentPortal() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [issueForm, setIssueForm] = useState({ sessionID: "", studentDescription: "", errorType: "" });
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [qrBusy, setQrBusy] = useState(false);
  const [myActiveCheckouts, setMyActiveCheckouts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [scannerTarget, setScannerTarget] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseClasses, setCourseClasses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [myClassId, setMyClassId] = useState(null);
  const [myClassDetails, setMyClassDetails] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [userTimeZoneId, setUserTimeZoneId] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scannerTimerRef = useRef(null);

  const openSessions = useMemo(
    () => sessions.filter((session) => !session.endTime).slice(0, 6),
    [sessions]
  );

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.isActive),
    [assignments]
  );

  const activeCheckoutByAsset = useMemo(
    () => myActiveCheckouts.reduce((acc, item) => {
      acc.set(`${item.classID ?? ""}-${item.roomAssetID ?? ""}`, item);
      return acc;
    }, new Map()),
    [myActiveCheckouts]
  );

  const assignedAssetsWithSessions = useMemo(() => {
    const sessionKeyFor = (item) => `${item.roomAssetID ?? ""}-${item.classID ?? ""}`;

    const openSessionByAsset = openSessions.reduce((acc, session) => {
      const key = sessionKeyFor(session);
      if (!acc.has(key)) {
        acc.set(key, session);
      }
      return acc;
    }, new Map());

    const assignmentItems = assignments.slice(0, 6).map((item) => ({
      type: "assignment",
      key: `assignment-${item.assignmentID}`,
      assignment: item,
      session: openSessionByAsset.get(sessionKeyFor(item)) || null,
    }));

    const existingSessionKeys = new Set(
      assignmentItems
        .filter((item) => item.session)
        .map((item) => String(item.session.sessionID))
    );

    const sessionOnlyItems = openSessions
      .filter((session) => !existingSessionKeys.has(String(session.sessionID)))
      .map((session) => ({
        type: "session",
        key: `session-${session.sessionID}`,
        assignment: null,
        session,
      }));

    return [...assignmentItems, ...sessionOnlyItems].slice(0, 6);
  }, [assignments, openSessions]);

  // Schedule items: enrolled class(es) → day-by-day view with asset info
  const scheduleItems = useMemo(() => {
    const assignmentByClass = activeAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.classID]) {
        acc[assignment.classID] = assignment;
      }
      return acc;
    }, {});

    const sessionsByClassDate = sessions.reduce((acc, session) => {
      const key = toDateKeyInTimeZone(session.startTime, userTimeZoneId);
      if (!key || !session.classID) {
        return acc;
      }

      const classKey = String(session.classID);
      if (!acc[classKey]) {
        acc[classKey] = {};
      }
      if (!acc[classKey][key]) {
        acc[classKey][key] = [];
      }

      acc[classKey][key].push({
        sessionID: session.sessionID,
        classID: session.classID,
        roomAssetID: session.roomAssetID,
        startTime: session.startTime,
        endTime: session.endTime,
        assetLabel: session.roomAssetID ? `Asset #${session.roomAssetID}` : null,
        attendanceStatus: session.attendanceStatus || "Pending",
      });
      return acc;
    }, {});

    const latestStatusByClass = sessions.reduce((acc, session) => {
      if (!session.classID || !session.startTime) {
        return acc;
      }

      const classKey = String(session.classID);
      const sessionTime = new Date(session.startTime).getTime();
      if (!acc[classKey] || sessionTime > acc[classKey].time) {
        acc[classKey] = {
          time: sessionTime,
          status: session.attendanceStatus || "Pending",
        };
      }

      return acc;
    }, {});

    const courseNameById = courses.reduce((acc, course) => {
      acc[course.courseID] = course.courseName;
      return acc;
    }, {});

    const sourceClasses =
      courseClasses.length > 0
        ? courseClasses
        : myClassDetails
        ? [myClassDetails]
        : [];

    // Only show classes the student is enrolled in
    return sourceClasses
      .filter((item) => !myClassId || item.classID === myClassId)
      .map((item) => {
        const assignment = assignmentByClass[item.classID] || null;
        const defaultAssetId = assignment?.roomAssetID || null;
        const defaultCheckout = defaultAssetId
          ? activeCheckoutByAsset.get(`${item.classID ?? ""}-${defaultAssetId}`) || null
          : null;

        const defaultLesson = {
          classID: item.classID,
          assignmentID: assignment?.assignmentID || null,
          roomAssetID: defaultAssetId,
          startTime: item.scheduleStartTime || "",
          endTime: item.scheduleEndTime || "",
          plannedStartTime: item.scheduleStartTime || "",
          plannedEndTime: item.scheduleEndTime || "",
          assetLabel: defaultAssetId ? `Asset #${defaultAssetId}` : "No assigned asset",
          activeCheckout: defaultCheckout,
          attendanceStatus: latestStatusByClass[String(item.classID)]?.status || "Not-checked",
        };

        const lessonsByDate = Object.entries(sessionsByClassDate[String(item.classID)] || {}).reduce(
          (acc, [dateKey, lessons]) => {
            acc[dateKey] = lessons.map((lesson) => {
              const lessonAssetId = lesson.roomAssetID || defaultAssetId;
              return {
                ...lesson,
                classID: item.classID,
                assignmentID: assignment?.assignmentID || null,
                roomAssetID: lessonAssetId,
                assetLabel: lessonAssetId ? `Asset #${lessonAssetId}` : "No assigned asset",
                plannedStartTime: item.scheduleStartTime || lesson.startTime || "",
                plannedEndTime: item.scheduleEndTime || lesson.endTime || "",
                activeCheckout: lessonAssetId
                  ? activeCheckoutByAsset.get(`${item.classID ?? ""}-${lessonAssetId}`) || null
                  : null,
              };
            });
            return acc;
          },
          {}
        );

        return {
          id: item.classID,
          name: item.className,
          courseName: item.courseName || courseNameById[item.courseID] || item.className,
          room: item.roomName || "",
          startDate: item.startDate,
          endDate: item.endDate,
          daysMask: item.scheduleDaysMask || 0,
          lessons: [defaultLesson],
          lessonsByDate,
        };
      });
  }, [courseClasses, myClassDetails, activeAssignments, myClassId, sessions, courses, userTimeZoneId, activeCheckoutByAsset]);

  const calendarEvents = useMemo(() => [], []);

  const showToast = (text, error = false) => {
    if (error) toast.error(text);
    else toast.success(text);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [myAssignments, activeCheckouts, me, activeCourses] = await Promise.all([
        studentEquipmentAssignmentService.getMine(),
        studentEquipmentAssignmentService.getMyActiveCheckouts(),
        getCurrentUser(),
        courseService.getActive(),
      ]);

      setAssignments(myAssignments || []);
      setMyActiveCheckouts(activeCheckouts || []);
      setCourses(activeCourses || []);

      const studentId = me?.studentRole?.studentID;
      const classId = me?.studentRole?.classID;
      setUserTimeZoneId(me?.timeZoneId || "");

      setMyClassId(classId || null);

      if (studentId) {
        const mySessions = await practiceSessionService.getByStudent(studentId);
        setSessions(mySessions || []);
      } else {
        setSessions([]);
      }

      if (classId) {
        try {
          const myClass = await classService.getById(classId);
          setMyClassDetails(myClass || null);
          if (myClass?.courseID) {
            setSelectedCourseId(String(myClass.courseID));
          }
        } catch {
          setMyClassDetails(null);
        }
      } else {
        setMyClassDetails(null);
      }
    } catch (error) {
      showToast(`${t(K.STUDENT_LOAD_FAILED, "Failed to load student portal")}: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const PERMANENT_INCIDENT_CATEGORIES = [
      { itemCode: "HARDWARE_FAILURE", label: t(K.INCIDENT_CATEGORY, "Incident category") === K.INCIDENT_CATEGORY ? "Hardware Failure" : "Hardware Failure" },
      { itemCode: "SOFTWARE_ISSUE", label: "Software Issue" },
      { itemCode: "NETWORK_ISSUE", label: "Network / Connectivity" },
      { itemCode: "POWER_ISSUE", label: "Power Issue" },
      { itemCode: "OTHER", label: "Other" },
    ];

    configurationService.getItems("ErrorType", language).then((items) => {
      const configItems = (items || []).map((item) => ({
        itemCode: item.itemCode,
        label: item.label || item.itemCode,
      }));
      // Merge permanent options with config items (config items override by code)
      const merged = [...PERMANENT_INCIDENT_CATEGORIES];
      configItems.forEach((ci) => {
        if (!merged.find((m) => m.itemCode === ci.itemCode)) {
          merged.push(ci);
        }
      });
      setIncidentCategories(merged);
    }).catch(() => {
      setIncidentCategories(PERMANENT_INCIDENT_CATEGORIES);
    });
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (!dateParam) {
      return;
    }

    const parsed = new Date(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      setCalendarDate(parsed);
    }
  }, [location.search]);

  useEffect(() => {
    return () => {
      if (scannerTimerRef.current) {
        clearInterval(scannerTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseClasses([]);
      setSelectedClassId("");
      return;
    }

    const fetchCourseClasses = async () => {
      try {
        const data = await classService.getByCourse(Number(selectedCourseId));
        setCourseClasses((data || []).filter((item) => item.isActive));
      } catch (error) {
        showToast(`${t(K.STUDENT_LOAD_COURSE_CLASSES_FAILED, "Failed to load classes for selected course")}: ${error.message}`, true);
        setCourseClasses([]);
      }
    };

    fetchCourseClasses();
  }, [selectedCourseId, t]);

  const stopScanner = () => {
    setIsScanning(false);
    setScannerTarget(null);
    if (scannerTimerRef.current) {
      clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const runQrAction = async (action, qrCodeValue) => {
    setQrBusy(true);
    try {
      if (action === "checkin") {
        await studentEquipmentAssignmentService.checkinByQr(qrCodeValue.trim());
        showToast(t(K.STUDENT_QR_CHECKIN_SUCCESS, "Asset check-in successful."));
      } else {
        await studentEquipmentAssignmentService.checkoutByQr(qrCodeValue.trim());
        showToast(t(K.STUDENT_QR_CHECKOUT_SUCCESS, "Asset checkout successful."));
      }
      await loadData();
    } catch (error) {
      showToast(
        `${t(
          action === "checkin" ? K.STUDENT_QR_CHECKIN_FAILED : K.STUDENT_QR_CHECKOUT_FAILED,
          action === "checkin" ? "QR check-in failed" : "QR checkout failed"
        )}: ${error.message}`,
        true
      );
    } finally {
      setQrBusy(false);
    }
  };

  const startScanner = async (target) => {
    try {
      if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
        setScannerSupported(false);
        showToast(t(K.STUDENT_SCANNER_UNSUPPORTED, "Camera QR scanning is not supported on this browser."), true);
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setIsScanning(true);
      setScannerSupported(true);
      setScannerTarget(target);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      let processing = false;

      scannerTimerRef.current = setInterval(async () => {
        if (!videoRef.current || processing) {
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            processing = true;
            stopScanner();
            await runQrAction(target.action, codes[0].rawValue);
          }
        } catch {
          // Ignore intermittent frame decode failures.
        }
      }, 500);
    } catch (error) {
      stopScanner();
      showToast(`${t(K.STUDENT_SCANNER_START_FAILED, "Unable to start camera scanner")}: ${error.message}`, true);
    }
  };

  const getLessonQrState = useCallback((lesson, selectedDate, lessonKey) => {
    const selectedDateKey = toDateKeyInTimeZone(selectedDate, userTimeZoneId);
    const todayKey = toDateKeyInTimeZone(new Date(), userTimeZoneId);
    const startMinutes = getMinutesInTimeZone(lesson.plannedStartTime || lesson.startTime, userTimeZoneId, selectedDate);
    const endMinutes = getMinutesInTimeZone(lesson.plannedEndTime || lesson.endTime, userTimeZoneId, selectedDate);
    const nowMinutes = getMinutesInTimeZone(new Date(), userTimeZoneId, selectedDate);
    const isTodayLesson = Boolean(selectedDateKey && todayKey && selectedDateKey === todayKey);
    const isCheckedOut = Boolean(lesson.activeCheckout);
    const canCheckout = isTodayLesson && !isCheckedOut && startMinutes !== null && nowMinutes !== null && nowMinutes >= startMinutes && nowMinutes <= startMinutes + 15;
    const canCheckin = isTodayLesson && isCheckedOut && endMinutes !== null && nowMinutes !== null && nowMinutes >= endMinutes && nowMinutes <= endMinutes + 15;
    const isCurrentScannerTarget = isScanning && scannerTarget?.lessonKey === lessonKey;

    if (!canCheckout && !canCheckin && !isCurrentScannerTarget) {
      return null;
    }

    return {
      action: canCheckin ? "checkin" : "checkout",
      isCurrentScannerTarget,
      buttonLabel: canCheckin
        ? t(K.STUDENT_QR_CHECKIN_BUTTON, "QR Check-In")
        : t(K.STUDENT_START_CAMERA, "Start Camera"),
      helperText: canCheckin
        ? t(K.STUDENT_QR_SCAN_CHECKIN_HINT, "Scan the asset QR to check in automatically.")
        : t(K.STUDENT_QR_SCAN_CHECKOUT_HINT, "Scan the asset QR to check out automatically."),
    };
  }, [isScanning, scannerTarget, t, userTimeZoneId]);

  const renderLessonActions = useCallback(({ lesson, lessonKey, selectedDate }) => {
    const qrState = getLessonQrState(lesson, selectedDate, lessonKey);

    if (!qrState) {
      return null;
    }

    return (
      <div className="mt-3 rounded-xl border border-sky-100 bg-white/70 p-3 dark:border-sky-900 dark:bg-navy-800/60">
        <p className="text-xs text-gray-500 dark:text-gray-300">{qrState.helperText}</p>
        <div className="mt-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => (qrState.isCurrentScannerTarget ? stopScanner() : startScanner({ lessonKey, action: qrState.action }))}
            disabled={qrBusy || (!scannerSupported && !qrState.isCurrentScannerTarget)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
              qrState.action === "checkin"
                ? "bg-navy-700 text-white hover:bg-navy-800"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-white"
            }`}
          >
            {qrState.isCurrentScannerTarget
              ? t(K.STUDENT_STOP_CAMERA, "Stop Camera")
              : qrState.buttonLabel}
          </button>
          <video
            ref={qrState.isCurrentScannerTarget ? videoRef : null}
            className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 ${qrState.isCurrentScannerTarget ? "block" : "hidden"}`}
            muted
            playsInline
          />
        </div>
      </div>
    );
  }, [getLessonQrState, qrBusy, scannerSupported, t]);

  const handleReportIssue = async (event) => {
    event.preventDefault();
    try {
      await practiceErrorLogService.create({
        sessionID: Number(issueForm.sessionID),
        errorTime: new Date().toISOString(),
        errorType: issueForm.errorType || undefined,
        studentDescription: issueForm.studentDescription,
        instructorNotified: true,
      });
      setIssueForm({ sessionID: "", studentDescription: "", errorType: "" });
      showToast(t(K.STUDENT_ISSUE_REPORTED, "Issue reported successfully."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.STUDENT_ISSUE_REPORT_FAILED, "Issue report failed")}: ${error.message}`, true);
    }
  };

  const handleEnroll = async (event) => {
    event.preventDefault();

    if (!selectedClassId) {
      showToast(t(K.STUDENT_SELECT_CLASS_TO_ENROLL, "Select a class to enroll."), true);
      return;
    }

    try {
      await classService.enrollMe(Number(selectedClassId));
      showToast(t(K.STUDENT_ENROLL_SUCCESS, "Enrollment completed."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.STUDENT_ENROLL_FAILED, "Enrollment failed")}: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Student Portal" titleKey={K.STUDENT_PORTAL_TITLE}>

      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            scheduleItems={scheduleItems}
            events={calendarEvents}
            timeZoneId={userTimeZoneId}
            title={t(K.STUDENT_TRAINING_CALENDAR, "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t(K.STUDENT_NO_EVENTS_ON_DATE, "No training events on selected date.")}
            renderLessonActions={renderLessonActions}
          />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_ENROLL_CLASS_TITLE, "Find Class And Enroll")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.STUDENT_ENROLL_CLASS_HINT, "Pick a course, browse classes, and enroll into a class.")}
          </p>
          <p className="mt-2 text-xs font-semibold text-brand-600">
            {myClassId
              ? `${t(K.STUDENT_CURRENT_CLASS, "Current class")} #${myClassId}`
              : t(K.STUDENT_NOT_ENROLLED, "You are not enrolled in any class yet.")}
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleEnroll}>
            <select
              required
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.STUDENT_SELECT_COURSE, "Select course")}</option>
              {courses.map((course) => (
                <option key={course.courseID} value={course.courseID}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
            <select
              required
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.STUDENT_SELECT_CLASS, "Select class")}</option>
              {courseClasses.map((item) => (
                <option key={item.classID} value={item.classID}>
                  {item.className} ({item.classCode})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || !selectedClassId}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {t(K.STUDENT_ENROLL_BUTTON, "Enroll To Class")}
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_REPORT_ISSUE_TITLE, "Report an Issue")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.STUDENT_REPORT_ISSUE_HINT, "Share any equipment issue during your current session.")}
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleReportIssue}>
            <select
              required
              value={issueForm.sessionID}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, sessionID: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.STUDENT_SELECT_SESSION, "Select session")}</option>
              {openSessions.map((session) => (
                <option key={session.sessionID} value={session.sessionID}>
                  {t(K.STUDENT_SESSION_ROW, "Session")} #{session.sessionID} • Asset #{session.roomAssetID}
                </option>
              ))}
            </select>
            <select
              value={issueForm.errorType}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, errorType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.INCIDENT_SELECT_CATEGORY, "Select incident category")}</option>
              {incidentCategories.map((cat) => (
                <option key={cat.itemCode} value={cat.itemCode}>{cat.label}</option>
              ))}
            </select>
            <textarea
              required
              rows={4}
              value={issueForm.studentDescription}
              onChange={(e) =>
                setIssueForm((prev) => ({ ...prev, studentDescription: e.target.value }))
              }
              placeholder={t(K.STUDENT_DESCRIBE_EVENT, "Describe what happened")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <button
              type="submit"
              disabled={loading || openSessions.length === 0}
              className="w-full rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {t(K.STUDENT_SUBMIT_ISSUE, "Submit Issue")}
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_ACTIVE_QR_CHECKOUTS, "My Active QR Checkouts")}</h2>
          <div className="mt-4 space-y-3">
            {myActiveCheckouts.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_NO_ACTIVE_QR_CHECKOUTS, "No active QR checkouts.")}</p>
            )}
            {myActiveCheckouts.map((item) => (
              <div
                key={item.assignmentID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <p className="text-sm font-semibold text-navy-700 dark:text-white">
                  Asset #{item.roomAssetID} • Class #{item.classID}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                  {t(K.STUDENT_QR_CHECKOUT_INFO, "Checked out at")} {formatDateTimeInTimeZone(item.assignedDate, userTimeZoneId)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_ASSETS_AND_SESSIONS, "My Assets & Sessions")}</h2>
          <div className="mt-4 space-y-3">
            {assignedAssetsWithSessions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_NO_ASSETS_OR_SESSIONS, "No assigned assets or active sessions.")}</p>
            )}
            {assignedAssetsWithSessions.map(({ key, assignment, session, type }) => (
              <div
                key={key}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      Asset #{assignment?.roomAssetID ?? session?.roomAssetID}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                      Class #{assignment?.classID ?? session?.classID}
                      {assignment?.assignedDate && (
                        <>
                          {" • "}{t(K.STUDENT_ASSIGNED_INFO, "Assigned")} {formatDateTimeInTimeZone(assignment.assignedDate, userTimeZoneId)}
                        </>
                      )}
                    </p>
                    {session ? (
                      <>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                          {t(K.STUDENT_SESSION_ROW, "Session")} #{session.sessionID} • {t(K.STUDENT_SESSION_INFO, "Start")} {formatDateTimeInTimeZone(session.startTime, userTimeZoneId)}
                        </p>
                        {session.attendanceStatus && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                            {t(K.STUDENT_ATTENDANCE_STATUS, "Attendance")}: {session.attendanceStatus}
                          </p>
                        )}
                      </>
                    ) : (
                      assignment && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                          {t(K.STUDENT_NO_OPEN_SESSION, "No active session on this asset.")}
                        </p>
                      )
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      session
                        ? "bg-sky-100 text-sky-700"
                        : assignment?.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {session
                      ? t(K.STUDENT_SESSION_OPEN, "Session Open")
                      : assignment?.isActive
                      ? t(K.STUDENT_ACTIVE, "Active")
                      : type === "session"
                      ? t(K.STUDENT_SESSION_OPEN, "Session Open")
                      : t(K.STUDENT_UNASSIGNED, "Unassigned")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
