import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const formatSessionTime = (value) => {
  if (!value) {
    return "";
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

export default function StudentPortal() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [issueForm, setIssueForm] = useState({ sessionID: "", studentDescription: "" });
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [myActiveCheckouts, setMyActiveCheckouts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [courses, setCourses] = useState([]);
  const [courseClasses, setCourseClasses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [myClassId, setMyClassId] = useState(null);
  const [myClassDetails, setMyClassDetails] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  // Schedule items: enrolled class(es) → day-by-day view with asset info
  const scheduleItems = useMemo(() => {
    const assetByClass = activeAssignments.reduce((acc, a) => {
      if (!acc[a.classID]) acc[a.classID] = a.roomAssetID;
      return acc;
    }, {});

    const sessionsByClassDate = sessions.reduce((acc, session) => {
      const key = toDateKey(session.startTime);
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
        startTime: formatSessionTime(session.startTime),
        endTime: formatSessionTime(session.endTime),
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
      .map((item) => ({
        id: item.classID,
        name: item.className,
        courseName: item.courseName || courseNameById[item.courseID] || item.className,
        room: item.roomName || "",
        startDate: item.startDate,
        endDate: item.endDate,
        daysMask: item.scheduleDaysMask || 0,
        lessons: [
          {
            startTime: item.scheduleStartTime || "",
            endTime: item.scheduleEndTime || "",
            assetLabel: assetByClass[item.classID]
              ? `Asset #${assetByClass[item.classID]}`
              : "No assigned asset",
            attendanceStatus:
              latestStatusByClass[String(item.classID)]?.status || "Not-checked",
          },
        ],
        lessonsByDate: sessionsByClassDate[String(item.classID)] || {},
      }));
  }, [courseClasses, myClassDetails, activeAssignments, myClassId, sessions, courses]);

  const calendarEvents = useMemo(() => [], []);

  const showToast = (text, error = false) => {
    setMessage(text);
    setIsError(error);
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
    if (scannerTimerRef.current) {
      clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startScanner = async () => {
    try {
      if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
        setScannerSupported(false);
        showToast(t(K.STUDENT_SCANNER_UNSUPPORTED, "Camera QR scanning is not supported on this browser. Use manual input."), true);
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setIsScanning(true);
      setScannerSupported(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scannerTimerRef.current = setInterval(async () => {
        if (!videoRef.current) {
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            setQrCodeValue(codes[0].rawValue);
            stopScanner();
            showToast(t(K.STUDENT_QR_DETECTED, "QR detected. Ready to submit."));
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

  const handleQrCheckout = async (event) => {
    event.preventDefault();
    if (!qrCodeValue.trim()) {
      showToast(t(K.STUDENT_ENTER_QR_FIRST, "Scan or enter a QR code value first."), true);
      return;
    }

    setQrBusy(true);
    try {
      await studentEquipmentAssignmentService.checkoutByQr(qrCodeValue.trim());
      showToast(t(K.STUDENT_QR_CHECKOUT_SUCCESS, "Asset checkout successful."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.STUDENT_QR_CHECKOUT_FAILED, "QR checkout failed")}: ${error.message}`, true);
    } finally {
      setQrBusy(false);
    }
  };

  const handleQrCheckin = async () => {
    if (!qrCodeValue.trim()) {
      showToast(t(K.STUDENT_ENTER_QR_FIRST, "Scan or enter a QR code value first."), true);
      return;
    }

    setQrBusy(true);
    try {
      await studentEquipmentAssignmentService.checkinByQr(qrCodeValue.trim());
      showToast(t(K.STUDENT_QR_CHECKIN_SUCCESS, "Asset check-in successful."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.STUDENT_QR_CHECKIN_FAILED, "QR check-in failed")}: ${error.message}`, true);
    } finally {
      setQrBusy(false);
    }
  };

  const handleReportIssue = async (event) => {
    event.preventDefault();
    try {
      await practiceErrorLogService.create({
        sessionID: Number(issueForm.sessionID),
        errorTime: new Date().toISOString(),
        studentDescription: issueForm.studentDescription,
        instructorNotified: true,
      });
      setIssueForm({ sessionID: "", studentDescription: "" });
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_MY_ACTIVE_ASSETS, "My Active Assets")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.STUDENT_READY_FOR_ATTENDANCE, "Ready for class attendance check")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_OPEN_SESSIONS, "Open Sessions")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{openSessions.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.STUDENT_CHECKOUT_TO_COMPLETE, "Check out to complete attendance")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_TOTAL_SESSIONS, "Total Sessions")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{sessions.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.STUDENT_PRACTICE_HISTORY, "Practice activity history")}</p>
        </Card>
      </div>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            scheduleItems={scheduleItems}
            events={calendarEvents}
            title={t(K.STUDENT_TRAINING_CALENDAR, "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t(K.STUDENT_NO_EVENTS_ON_DATE, "No training events on selected date.")}
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

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_QR_SECTION_TITLE, "QR Checkout / Check-In")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.STUDENT_QR_SECTION_HINT, "Scan with camera or enter QR manually to check out and check in assets.")}
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleQrCheckout}>
            <input
              required
              value={qrCodeValue}
              onChange={(e) => setQrCodeValue(e.target.value)}
              placeholder={t(K.STUDENT_QR_CODE_VALUE, "QR code value")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="submit"
                disabled={loading || qrBusy}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {t(K.STUDENT_QR_CHECKOUT_BUTTON, "QR Checkout")}
              </button>
              <button
                type="button"
                onClick={handleQrCheckin}
                disabled={loading || qrBusy}
                className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
              >
                {t(K.STUDENT_QR_CHECKIN_BUTTON, "QR Check-In")}
              </button>
              <button
                type="button"
                onClick={isScanning ? stopScanner : startScanner}
                disabled={!scannerSupported && !isScanning}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {isScanning
                  ? t(K.STUDENT_STOP_CAMERA, "Stop Camera")
                  : t(K.STUDENT_START_CAMERA, "Start Camera")}
              </button>
            </div>
            <video
              ref={videoRef}
              className={`w-full rounded-xl border border-gray-200 ${isScanning ? "block" : "hidden"}`}
              muted
              playsInline
            />
          </form>
        </Card>

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
                  {t(K.STUDENT_QR_CHECKOUT_INFO, "Checked out at")} {new Date(item.assignedDate).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_MY_ASSIGNED_ASSETS, "My Assigned Assets")}</h2>
          <div className="mt-4 space-y-3">
            {assignments.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_NO_ASSIGNMENTS, "No assignments yet.")}</p>
            )}
            {assignments.slice(0, 6).map((item) => (
              <div
                key={item.assignmentID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-700 dark:text-white">
                    Asset #{item.roomAssetID}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      item.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {item.isActive
                      ? t(K.STUDENT_ACTIVE, "Active")
                      : t(K.STUDENT_UNASSIGNED, "Unassigned")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                  Class #{item.classID} • {t(K.STUDENT_ASSIGNED_INFO, "Assigned")} {new Date(item.assignedDate).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.STUDENT_OPEN_SESSIONS, "Open Sessions")}</h2>
          <div className="mt-4 space-y-3">
            {openSessions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.STUDENT_NO_ACTIVE_CHECKINS, "No active check-ins.")}</p>
            )}
            {openSessions.map((session) => (
              <div
                key={session.sessionID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      {t(K.STUDENT_SESSION_ROW, "Session")} #{session.sessionID}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      Asset #{session.roomAssetID} • {t(K.STUDENT_SESSION_INFO, "Start")} {new Date(session.startTime).toLocaleString()}
                    </p>
                    {session.attendanceStatus && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                        {t(K.STUDENT_ATTENDANCE_STATUS, "Attendance")}: {session.attendanceStatus}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
