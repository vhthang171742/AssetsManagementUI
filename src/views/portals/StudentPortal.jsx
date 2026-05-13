import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Card from "components/card";
import EntityPill from "components/EntityPill";
import Modal from "components/modal/Modal";
import RoomPill from "components/RoomPill";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import StudentAssignedAssetPill, { buildStudentAssignedAssetModalData } from "./components/StudentAssignedAssetPill";
import PortalLayout from "layouts/portal";
import {
  studentEquipmentAssignmentService,
  practiceSessionService,
  classService,
  courseService,
} from "services/api";
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
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
  const { currentUser, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [qrBusy, setQrBusy] = useState(false);
  const [myActiveCheckouts, setMyActiveCheckouts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [scannerTarget, setScannerTarget] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseClasses, setCourseClasses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
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

  const openSessionByClassAsset = useMemo(
    () => sessions.filter((session) => !session.endTime).reduce((acc, session) => {
      acc.set(`${session.classID ?? ""}-${session.roomAssetID ?? ""}`, session);
      return acc;
    }, new Map()),
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

  // Only show active assignments
  const assignedAssetsWithSessions = useMemo(() => {
    const sessionKeyFor = (item) => `${item.roomAssetID ?? ""}-${item.classID ?? ""}`;

    const openSessionByAsset = openSessions.reduce((acc, session) => {
      const key = sessionKeyFor(session);
      if (!acc.has(key)) {
        acc.set(key, session);
      }
      return acc;
    }, new Map());

    // Only include active assignments
    const activeAssignments = assignments.filter((item) => item.isActive && (!('unassignedDate' in item) || !item.unassignedDate));
    const assignmentItems = activeAssignments.slice(0, 6).map((item) => ({
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
        assetID: session.assetID || null,
        assetCode: session.assetCode || null,
        startTime: session.startTime,
        endTime: session.endTime,
        assetLabel: session.assetCode || (session.roomAssetID ? `Asset #${session.roomAssetID}` : null),
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
        const scheduleGroups = Array.isArray(item.scheduleGroups) && item.scheduleGroups.length > 0
          ? item.scheduleGroups
          : [{
              daysMask: item.scheduleDaysMask || 0,
              startTime: item.scheduleStartTime || "",
              endTime: item.scheduleEndTime || "",
            }];

        const lessons = scheduleGroups.map((group) => ({
          classID: item.classID,
          assignmentID: assignment?.assignmentID || null,
          roomAssetID: defaultAssetId,
          assetID: assignment?.assetID || null,
          assetCode: assignment?.assetCode || null,
          serialNumber: assignment?.serialNumber || null,
          assetStatus: assignment?.assetStatus || null,
          startTime: group.startTime || item.scheduleStartTime || "",
          endTime: group.endTime || item.scheduleEndTime || "",
          plannedStartTime: group.startTime || item.scheduleStartTime || "",
          plannedEndTime: group.endTime || item.scheduleEndTime || "",
          assetLabel: assignment?.serialNumber
            ? `SN ${assignment.serialNumber}`
            : assignment?.assetCode ? assignment.assetCode : (defaultAssetId ? `Asset #${defaultAssetId}` : "No assigned asset"),
          activeCheckout: defaultCheckout,
          attendanceStatus: latestStatusByClass[String(item.classID)]?.status || "Not-checked",
        }));

        const lessonsByDate = Object.entries(sessionsByClassDate[String(item.classID)] || {}).reduce(
          (acc, [dateKey, lessons]) => {
            acc[dateKey] = lessons.map((lesson) => {
              const lessonAssetId = lesson.roomAssetID || defaultAssetId;
              const lessonAssetCode = lesson.assetCode || (lessonAssetId === (assignment?.roomAssetID) ? assignment?.assetCode : null);
              return {
                ...lesson,
                classID: item.classID,
                assignmentID: assignment?.assignmentID || null,
                roomAssetID: lessonAssetId,
                assetID: lesson.assetID || (lessonAssetId === (assignment?.roomAssetID) ? assignment?.assetID : null) || null,
                assetCode: lessonAssetCode || null,
                serialNumber: assignment?.serialNumber || null,
                assetStatus: assignment?.assetStatus || null,
                assetLabel: assignment?.serialNumber
                  ? `SN ${assignment.serialNumber}`
                  : lessonAssetCode || (lessonAssetId ? `Asset #${lessonAssetId}` : "No assigned asset"),
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
          classCode: item.classCode || null,
          name: item.className,
          courseName: item.courseName || courseNameById[item.courseID] || item.className,
          roomID: item.roomID || null,
          room: item.roomName || "",
          startDate: item.startDate,
          endDate: item.endDate,
          daysMask: item.scheduleDaysMask || 0,
          lessons,
          lessonsByDate,
        };
      });
  }, [courseClasses, myClassDetails, activeAssignments, myClassId, sessions, courses, userTimeZoneId, activeCheckoutByAsset]);

  const calendarEvents = useMemo(() => [], []);

  const scheduleDayLabels = useMemo(() => ([
    { bit: 1 << 1, label: t(K.ADMIN_TABLE_MON, "Mon") },
    { bit: 1 << 2, label: t(K.ADMIN_TABLE_TUE, "Tue") },
    { bit: 1 << 3, label: t(K.ADMIN_TABLE_WED, "Wed") },
    { bit: 1 << 4, label: t(K.ADMIN_TABLE_THU, "Thu") },
    { bit: 1 << 5, label: t(K.ADMIN_TABLE_FRI, "Fri") },
    { bit: 1 << 6, label: t(K.ADMIN_TABLE_SAT, "Sat") },
    { bit: 1 << 0, label: t(K.ADMIN_TABLE_SUN, "Sun") },
  ]), [t]);

  const formatDateLabel = useCallback((value) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }

    const locale = language === "vi-VN" ? "vi-VN" : "en-GB";
    return parsed.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [language]);

  const toShortTime = useCallback((value) => {
    if (!value) {
      return "--:--";
    }

    const [h, m] = String(value).split(":");
    if (h == null || m == null) {
      return String(value);
    }

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, []);

  const formatScheduleSummary = useCallback((item) => {
    const groups = Array.isArray(item?.scheduleGroups) && item.scheduleGroups.length > 0
      ? item.scheduleGroups
      : [{
          daysMask: item?.scheduleDaysMask || 0,
          startTime: item?.scheduleStartTime || "",
          endTime: item?.scheduleEndTime || "",
        }];

    const rows = groups
      .filter((group) => Number(group.daysMask) > 0)
      .map((group) => {
        const dayText = scheduleDayLabels
          .filter((day) => (Number(group.daysMask) & day.bit) !== 0)
          .map((day) => day.label)
          .join(", ");

        const referenceDate = item?.startDate || item?.endDate || null;
        const startTime = group.startTime
          ? utcClockTimeToTimeZone(group.startTime, userTimeZoneId, referenceDate)
          : "";
        const endTime = group.endTime
          ? utcClockTimeToTimeZone(group.endTime, userTimeZoneId, referenceDate)
          : "";

        return `${dayText} • ${toShortTime(startTime)} - ${toShortTime(endTime)}`;
      });

    return rows.length > 0 ? rows : ["-"];
  }, [scheduleDayLabels, toShortTime, userTimeZoneId]);

  const isCancellationOpen = useCallback((item) => {
    if (!item?.startDate) {
      return true;
    }

    const classStart = new Date(item.startDate);
    if (Number.isNaN(classStart.getTime())) {
      return true;
    }

    const cutOffDays = Number(item.cancelEnrollmentBeforeStartDays ?? 0);
    const cutOffDate = new Date(classStart);
    cutOffDate.setHours(0, 0, 0, 0);
    cutOffDate.setDate(cutOffDate.getDate() - Math.max(0, cutOffDays));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today <= cutOffDate;
  }, []);

  const showToast = (text, error = false) => {
    if (error) toast.error(text);
    else toast.success(text);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [myAssignments, activeCheckouts, activeCourses] = await Promise.all([
        studentEquipmentAssignmentService.getMine(),
        studentEquipmentAssignmentService.getMyActiveCheckouts(),
        courseService.getActive(),
      ]);

      setAssignments(myAssignments || []);
      setMyActiveCheckouts(activeCheckouts || []);
      setCourses(activeCourses || []);

      // Use currentUser from AuthContext instead of fetching again
      const me = currentUser;
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
    if (!authLoading && currentUser) {
      loadData();
    }
  }, [currentUser?.userProfileID, language]);

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
    if (!isScanning || !streamRef.current || !videoRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {
      // Ignore autoplay issues; camera stays open and user can retry.
    });
  }, [isScanning, scannerTarget]);

  const loadCourseClasses = useCallback(async (courseIdValue) => {
    if (!courseIdValue) {
      setCourseClasses([]);
      return;
    }

    try {
      const data = await classService.getByCourse(Number(courseIdValue));
      setCourseClasses((data || []).filter((item) => item.isActive));
    } catch (error) {
      showToast(`${t(K.STUDENT_LOAD_COURSE_CLASSES_FAILED, "Failed to load classes for selected course")}: ${error.message}`, true);
      setCourseClasses([]);
    }
  }, [t]);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseClasses([]);
      return;
    }

    loadCourseClasses(selectedCourseId);
  }, [selectedCourseId, loadCourseClasses]);

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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const runQrAction = async (action, qrCodeValue) => {
    setQrBusy(true);
    try {
      if (action === "checkin") {
        await studentEquipmentAssignmentService.checkinByQr(qrCodeValue.trim());
        showToast(t(K.STUDENT_QR_CHECKIN_SUCCESS, "End attendance successful."));
      } else {
        await studentEquipmentAssignmentService.checkoutByQr(qrCodeValue.trim());
        showToast(t(K.STUDENT_QR_CHECKOUT_SUCCESS, "Start attendance successful."));
      }
      await loadData();
    } catch (error) {
      showToast(
        `${t(
          action === "checkin" ? K.STUDENT_QR_CHECKIN_FAILED : K.STUDENT_QR_CHECKOUT_FAILED,
          action === "checkin" ? "End attendance failed" : "Start attendance failed"
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
        ? t(K.STUDENT_QR_CHECKIN_BUTTON, "End Attendance")
        : t(K.STUDENT_START_CAMERA, "Start Camera"),
      helperText: canCheckin
        ? t(K.STUDENT_QR_SCAN_CHECKIN_HINT, "Scan the asset QR to end attendance automatically.")
        : t(K.STUDENT_QR_SCAN_CHECKOUT_HINT, "Scan the asset QR to start attendance automatically."),
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
        </div>
      </div>
    );
  }, [getLessonQrState, qrBusy, scannerSupported, t]);

  const getSessionForAsset = useCallback((assignment, session) => {
    if (session?.sessionID) {
      return session;
    }

    const classID = assignment?.classID ?? session?.classID ?? "";
    const roomAssetID = assignment?.roomAssetID ?? session?.roomAssetID ?? "";
    return openSessionByClassAsset.get(`${classID}-${roomAssetID}`) || null;
  }, [openSessionByClassAsset]);

  const handleIssueReported = useCallback(async () => {
    await loadData();
    if (selectedCourseId) {
      await loadCourseClasses(selectedCourseId);
    }
  }, [loadCourseClasses, loadData, selectedCourseId]);

  const buildAssignedAssetModalData = useCallback((assignment, session) => {
    const resolvedSession = getSessionForAsset(assignment, session);
    return buildStudentAssignedAssetModalData({
      assignment,
      session: resolvedSession,
      incidentCategories,
      userTimeZoneId,
      onIssueReported: handleIssueReported,
    });
  }, [getSessionForAsset, handleIssueReported, incidentCategories, userTimeZoneId]);

  const handleEnroll = async (classId) => {
    try {
      await classService.enrollMe(Number(classId));
      showToast(t(K.STUDENT_ENROLL_SUCCESS, "Enrollment completed."));
      await loadData();
      if (selectedCourseId) {
        await loadCourseClasses(selectedCourseId);
      }
    } catch (error) {
      showToast(`${t(K.STUDENT_ENROLL_FAILED, "Enrollment failed")}: ${error.message}`, true);
    }
  };

  const handleCancelEnrollment = async (classId) => {
    try {
      await classService.cancelEnrollmentMe(Number(classId));
      showToast(t(K.STUDENT_CANCEL_ENROLLMENT_SUCCESS, "Enrollment canceled."));
      await loadData();
      if (selectedCourseId) {
        await loadCourseClasses(selectedCourseId);
      }
    } catch (error) {
      showToast(`${t(K.STUDENT_CANCEL_ENROLLMENT_FAILED, "Failed to cancel enrollment")}: ${error.message}`, true);
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
            buildLessonAssetModalData={({ lesson }) => buildAssignedAssetModalData(
              {
                assignmentID: lesson.assignmentID || null,
                classID: lesson.classID || null,
                roomAssetID: lesson.roomAssetID || null,
                serialNumber: lesson.serialNumber || null,
                assetStatus: lesson.assetStatus || null,
              },
              lesson.sessionID
                ? {
                    sessionID: lesson.sessionID,
                    classID: lesson.classID || null,
                    roomAssetID: lesson.roomAssetID || null,
                    startTime: lesson.startTime || null,
                  }
                : null
            )}
          />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_ENROLL_CLASS_TITLE, "Find Class And Enroll")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.STUDENT_ENROLL_CLASS_HINT, "Pick a course, browse classes, and enroll into a class.")}
          </p>
          <div className="mt-2 text-xs font-semibold text-brand-600">
            {myClassId
              ? (
                myClassDetails?.classCode
                  ? <span>{t(K.STUDENT_CURRENT_CLASS, "Current class")}: <EntityPill type="class" id={myClassId} label={myClassDetails.classCode} /></span>
                  : `${t(K.STUDENT_CURRENT_CLASS, "Current class")} #${myClassId}`
              )
              : t(K.STUDENT_NOT_ENROLLED, "You are not enrolled in any class yet.")}
          </div>
          <div className="mt-4 space-y-3">
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

            {!selectedCourseId && (
              <p className="text-sm text-gray-500 dark:text-gray-300">
                {t(K.STUDENT_SELECT_COURSE_TO_VIEW_CLASSES, "Select a course to view available classes.")}
              </p>
            )}

            {selectedCourseId && courseClasses.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">
                {t(K.STUDENT_NO_CLASSES_FOR_COURSE, "No available classes for this course.")}
              </p>
            )}

            {selectedCourseId && courseClasses.length > 0 && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {courseClasses.map((item) => {
                  const isMyClass = Number(item.classID) === Number(myClassId);
                  const canCancel = isMyClass && isCancellationOpen(item);
                  const disableEnroll = loading || Boolean(myClassId);
                  const scheduleRows = formatScheduleSummary(item);
                  const enrolledStudents = Number(item.enrolledStudents || 0);
                  const maxStudents = Number(item.maxStudents || 0);
                  const availableSlots = typeof item.availableSlots === "number"
                    ? item.availableSlots
                    : (maxStudents > 0 && maxStudents < 2147483647 ? Math.max(0, maxStudents - enrolledStudents) : null);

                  return (
                    <div
                      key={item.classID}
                      className={`rounded-xl border p-4 ${isMyClass ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-navy-900"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-navy-700 dark:text-white">{item.className || "-"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{t(K.STUDENT_CLASS_CODE, "Code")}: {item.classCode || "-"}</p>
                        </div>
                        {isMyClass && (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {t(K.STUDENT_CURRENT_CLASS_BADGE, "Enrolled")}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        <p><span className="font-semibold">{t(K.STUDENT_CLASS_TEACHER, "Teacher")}:</span> {item.instructorName || "-"}</p>
                        <p>
                          <span className="font-semibold">{t(K.STUDENT_CLASS_ROOM, "Room")}:</span>{" "}
                          <RoomPill roomId={item.roomID || null} label={item.roomName || "-"} roomName={item.roomName || null} />
                        </p>
                        <p><span className="font-semibold">{t(K.STUDENT_CLASS_DATE_RANGE, "Date")}:</span> {formatDateLabel(item.startDate)} - {formatDateLabel(item.endDate)}</p>
                        <p>
                          <span className="font-semibold">{t(K.STUDENT_CLASS_AVAILABLE_SLOTS, "Available slots")}:</span>{" "}
                          {availableSlots == null
                            ? t(K.STUDENT_CLASS_UNLIMITED_SLOTS, "Unlimited")
                            : `${availableSlots}`}
                          {maxStudents > 0 && maxStudents < 2147483647 ? ` / ${maxStudents}` : ""}
                        </p>
                        <div>
                          <p className="font-semibold">{t(K.STUDENT_CLASS_SCHEDULE, "Schedule")}:</p>
                          {scheduleRows.map((row, idx) => (
                            <p key={`${item.classID}-schedule-${idx}`}>{row}</p>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4">
                        {isMyClass ? (
                          canCancel ? (
                            <button
                              type="button"
                              onClick={() => handleCancelEnrollment(item.classID)}
                              disabled={loading}
                              className="w-full rounded-xl border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/20"
                            >
                              {t(K.STUDENT_WITHDRAW_ENROLLMENT_BUTTON, "Withdraw Enrollment")}
                            </button>
                          ) : (
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                              {t(K.STUDENT_ENROLLMENT_CANCELLATION_CLOSED, "Enrollment withdrawal window is closed for this class.")}
                            </p>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEnroll(item.classID)}
                              disabled={disableEnroll}
                              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                            >
                              {t(K.STUDENT_ENROLL_BUTTON, "Enroll To Class")}
                            </button>
                            {myClassId && (
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                                {t(K.STUDENT_ONE_CLASS_ONLY_HINT, "You are already enrolled in a class. Withdraw first to enroll in another class.")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                <div className="flex flex-wrap items-center gap-1 text-sm font-semibold text-navy-700 dark:text-white">
                  {item.assetID
                    ? <StudentAssignedAssetPill
                        assetId={item.assetID}
                        label={item.serialNumber ? `SN ${item.serialNumber}` : (item.assetCode || `Asset #${item.roomAssetID}`)}
                        assignment={item}
                        session={getSessionForAsset(item, null)}
                        incidentCategories={incidentCategories}
                        userTimeZoneId={userTimeZoneId}
                        onIssueReported={handleIssueReported}
                      />
                    : <span>Asset #{item.roomAssetID}</span>
                  }
                  {item.classCode
                    ? <EntityPill type="class" id={item.classID} label={item.classCode} />
                    : <span>Class #{item.classID}</span>
                  }
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                  {t(K.STUDENT_QR_CHECKOUT_INFO, "Checked out at")} {formatDateTimeInTimeZone(item.assignedDate, userTimeZoneId)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_ASSETS_AND_SESSIONS, "My Assets & Sessions")}</h2>
          <div className="mt-4 space-y-3" style={{ maxHeight: 480, overflowY: 'auto' }}>
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
                    <div className="flex flex-wrap items-center gap-1">
                      {(assignment?.assetID || session?.assetID)
                        ? <StudentAssignedAssetPill
                            assetId={assignment?.assetID || session?.assetID}
                            label={assignment?.serialNumber
                              ? `SN ${assignment.serialNumber}`
                              : assignment?.assetCode || session?.assetCode || `Asset #${assignment?.roomAssetID ?? session?.roomAssetID}`}
                            assignment={assignment}
                            session={getSessionForAsset(assignment, session)}
                            incidentCategories={incidentCategories}
                            userTimeZoneId={userTimeZoneId}
                            onIssueReported={handleIssueReported}
                          />
                        : <p className="text-sm font-semibold text-navy-700 dark:text-white">Asset #{assignment?.roomAssetID ?? session?.roomAssetID}</p>
                      }
                      {(assignment?.classCode || session?.classCode)
                        ? <EntityPill type="class" id={assignment?.classID ?? session?.classID} label={assignment?.classCode || session?.classCode} />
                        : <p className="text-sm font-semibold text-navy-700 dark:text-white">Class #{assignment?.classID ?? session?.classID}</p>
                      }
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
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

      <Modal
        isOpen={isScanning && Boolean(scannerTarget)}
        onClose={stopScanner}
        title={t(K.STUDENT_QR_SECTION_TITLE, "Start Attendance / End Attendance")}
        maxWidth="max-w-xl"
        footer={(
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-white"
          >
            {t(K.STUDENT_STOP_CAMERA, "Stop Camera")}
          </button>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {scannerTarget?.action === "checkin"
              ? t(K.STUDENT_QR_SCAN_CHECKIN_HINT, "Scan the asset QR to end attendance automatically.")
              : t(K.STUDENT_QR_SCAN_CHECKOUT_HINT, "Scan the asset QR to start attendance automatically.")}
          </p>
          <video
            ref={videoRef}
            className="w-full rounded-xl border border-gray-200 bg-black/90 dark:border-gray-700"
            muted
            playsInline
            autoPlay
          />
        </div>
      </Modal>
    </PortalLayout>
  );
}
