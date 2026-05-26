import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import Card from "components/card";
import Modal from "components/modal/Modal";
import PortalLayout from "layouts/portal";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import { workerEquipmentService, equipmentUsageService, workerCalendarService } from "services";
import { workSessionService } from "services/workSessionService";
import { httpClient } from "services/httpClient";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { formatDateInTimeZone, formatDateTimeInTimeZone, parseApiDateTime, toDateKeyInTimeZone } from "services/dateTimeService";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatElapsed(startDate) {
  const diffMs = Date.now() - startDate.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function extractApiDateKey(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function toNoonUtcIso(dateKey) {
  return `${dateKey}T12:00:00Z`;
}

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      Inactive
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkerPortal() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";

  // Data state
  const [workerProfile, setWorkerProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active production session (exclude worker attendance-only logs)
  const activeSession = usageLogs.find((l) => !l.endTime && !(l.notes || "").includes("[WORKING_ATTENDANCE]")) || null;

  // Form state
  const [startForm, setStartForm] = useState({ roomAssetID: "", startTime: "" });
  const [endForm, setEndForm] = useState({ endTime: "", runningMinutes: "", downtimeMinutes: "", stitchCount: "", notes: "" });
  const [activeForm, setActiveForm] = useState(null); // "start" | "end" | null
  const [submitting, setSubmitting] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [workingEvents, setWorkingEvents] = useState([]);
  const [qrBusy, setQrBusy] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [scannerTarget, setScannerTarget] = useState(null);

  // Checkout quantity modal
  const [pendingCheckoutQr, setPendingCheckoutQr] = useState(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");

  // Modal visibility
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showActiveSessionModal, setShowActiveSessionModal] = useState(false);
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showUsageHistoryModal, setShowUsageHistoryModal] = useState(false);

  const videoRef = useRef(null);
  const scannerTimerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const loadedCalendarMonthRef = useRef("");

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, assignmentsRes, logsRes] = await Promise.all([
        httpClient("/users/me"),
        workerEquipmentService.getMine(),
        equipmentUsageService.getMine(),
      ]);
      setWorkerProfile(profileRes?.data ?? profileRes ?? null);
      setAssignments(assignmentsRes?.data ?? assignmentsRes ?? []);
      setUsageLogs(logsRes?.data ?? logsRes ?? []);
    } catch (err) {
      console.error("WorkerPortal load error:", err);
      setError(t(K.WORKER_LOAD_FAILED, "Failed to load worker data."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadWorkingCalendar = useCallback(async (date, force = false) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month}`;
      if (!force && loadedCalendarMonthRef.current === monthKey) {
        return;
      }
      const data = await workerCalendarService.getMyCalendar(year, month);
      setWorkingEvents(data || []);
      loadedCalendarMonthRef.current = monthKey;
    } catch (err) {
      console.error("Worker calendar load error:", err);
    }
  }, []);

  useEffect(() => {
    loadWorkingCalendar(calendarDate);
  }, [calendarDate, loadWorkingCalendar]);

  const handleCalendarActiveMonthChange = useCallback((activeMonthStartDate) => {
    if (!activeMonthStartDate) {
      return;
    }
    loadWorkingCalendar(activeMonthStartDate);
  }, [loadWorkingCalendar]);

  const stopScanner = useCallback(() => {
    setIsScanning(false);
    setScannerTarget(null);
    if (scannerTimerRef.current) {
      clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }

    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const runQrAttendanceAction = useCallback(async (mode, code) => {
    const cleaned = (code || "").trim();
    if (!cleaned) {
      toast.error(t(K.WORKER_QR_INPUT_PLACEHOLDER, "Enter or scan QR code value"));
      return;
    }

    if (mode === "checkout") {
      // Intercept checkout: show quantity modal first
      setPendingCheckoutQr(cleaned);
      setCheckoutQuantity("");
      setCheckoutNotes("");
      return;
    }

    setQrBusy(true);
    try {
      await workSessionService.checkinByQr(cleaned);
      toast.success(t(K.WORKER_QR_CHECKIN_SUCCESS, "Attendance started successfully."));
      await Promise.all([loadData(), loadWorkingCalendar(calendarDate, true)]);
    } catch (err) {
      toast.error(`${t(K.WORKER_QR_ACTION_FAILED, "QR attendance action failed")}: ${err?.message || "Unknown error"}`);
    } finally {
      setQrBusy(false);
    }
  }, [calendarDate, loadData, loadWorkingCalendar, t]);

  const handleCheckoutConfirm = useCallback(async () => {
    if (!pendingCheckoutQr) return;
    setQrBusy(true);
    const qty = checkoutQuantity !== "" ? Number(checkoutQuantity) : null;
    try {
      await workSessionService.checkoutByQr(pendingCheckoutQr, qty, checkoutNotes || null);
      toast.success(t(K.WORKER_QR_CHECKOUT_SUCCESS, "Attendance ended successfully."));
      setPendingCheckoutQr(null);
      setCheckoutQuantity("");
      setCheckoutNotes("");
      await Promise.all([loadData(), loadWorkingCalendar(calendarDate, true)]);
    } catch (err) {
      toast.error(`${t(K.WORKER_QR_ACTION_FAILED, "QR attendance action failed")}: ${err?.message || "Unknown error"}`);
    } finally {
      setQrBusy(false);
    }
  }, [calendarDate, checkoutNotes, checkoutQuantity, loadData, loadWorkingCalendar, pendingCheckoutQr, t]);

  const startScanner = useCallback(async (target) => {
    try {
      if (!window.BarcodeDetector) {
        setScannerSupported(false);
        toast.error(t(K.WORKER_CAMERA_UNSUPPORTED, "Camera QR scanning is not supported on this browser."));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setScannerTarget(target);
      setIsScanning(true);
      setScannerSupported(true);

      scannerTimerRef.current = setInterval(async () => {
        if (!videoRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);
          if (!codes || codes.length === 0) return;

          const raw = codes[0]?.rawValue || "";
          if (!raw) return;

          stopScanner();
          await runQrAttendanceAction(target.action, raw);
        } catch {
          // ignore transient detection errors
        }
      }, 600);
    } catch (error) {
      stopScanner();
      toast.error(`${t(K.WORKER_CAMERA_START_FAILED, "Unable to start camera scanner")}: ${error.message}`);
    }
  }, [runQrAttendanceAction, stopScanner, t]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // ── Start session ──────────────────────────────────────────────────────────

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!startForm.roomAssetID || !startForm.startTime) return;

    const productionLineID = workerProfile?.workerRole?.workerID
      ? workerProfile.workerRole?.productionLineID
      : null;

    if (!productionLineID) {
      toast.error(t(K.WORKER_NO_LINE, "No production line assigned"));
      return;
    }

    setSubmitting(true);
    try {
      await equipmentUsageService.startSession({
        roomAssetID: Number(startForm.roomAssetID),
        productionLineID: Number(productionLineID),
        startTime: new Date(startForm.startTime).toISOString(),
      });
      toast.success(t(K.WORKER_SESSION_STARTED, "Session started successfully."));
      setActiveForm(null);
      setStartForm({ roomAssetID: "", startTime: "" });
      await loadData();
    } catch (err) {
      toast.error(err?.message || t(K.WORKER_SESSION_START_FAILED, "Failed to start session."));
    } finally {
      setSubmitting(false);
    }
  };

  // ── End session ────────────────────────────────────────────────────────────

  const handleEndSession = async (e) => {
    e.preventDefault();
    if (!activeSession || !endForm.endTime) return;

    setSubmitting(true);
    try {
      await equipmentUsageService.endSession(activeSession.usageLogID, {
        endTime: new Date(endForm.endTime).toISOString(),
        runningMinutes: endForm.runningMinutes ? Number(endForm.runningMinutes) : null,
        downtimeMinutes: endForm.downtimeMinutes ? Number(endForm.downtimeMinutes) : null,
        stitchCount: endForm.stitchCount ? Number(endForm.stitchCount) : null,
        notes: endForm.notes || null,
      });
      toast.success(t(K.WORKER_SESSION_ENDED, "Session ended successfully."));
      setActiveForm(null);
      setEndForm({ endTime: "", runningMinutes: "", downtimeMinutes: "", stitchCount: "", notes: "" });
      await loadData();
    } catch (err) {
      toast.error(err?.message || t(K.WORKER_SESSION_END_FAILED, "Failed to end session."));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived (hooks must come before early returns) ───────────────────────────

  const activeAssignments = useMemo(() => assignments.filter((a) => a.isActive), [assignments]);

  const calendarScheduleItems = useMemo(
    () =>
      (workingEvents || []).map((item, index) => {
        const eventDateKey = extractApiDateKey(item.date) || toDateKeyInTimeZone(item.date, userTimeZoneId);
        const normalizedDate = eventDateKey ? toNoonUtcIso(eventDateKey) : item.date;
        const lesson = {
          summaryLabel: item.title || t(K.WORKER_SHIFT_LABEL, "Shift"),
          startTime: item.shiftStartUtc,
          endTime: item.shiftEndUtc,
          checkinAllowedFromUtc: item.checkinAllowedFromUtc,
          checkinAllowedToUtc: item.checkinAllowedToUtc,
          checkoutAllowedFromUtc: item.checkoutAllowedFromUtc,
          checkoutAllowedToUtc: item.checkoutAllowedToUtc,
          attendanceStatus: item.attendanceStatus,
          checkinAtUtc: item.checkinAtUtc,
          checkoutAtUtc: item.checkoutAtUtc,
          assetLabel: item.checkinAtUtc
            ? `${t(K.WORKER_QR_CHECKIN, "Start attendance")}: ${formatDateTimeInTimeZone(parseApiDateTime(item.checkinAtUtc), userTimeZoneId)}`
            : null,
        };

        return {
          id: `worker-shift-${index}`,
          name: item.title || t(K.WORKER_WORKING_CALENDAR, "Working Calendar"),
          room: workerProfile?.workerRole?.productionLineName || "",
          startDate: normalizedDate,
          endDate: normalizedDate,
          // Worker calendar API returns one event per day; keep matching date-key based to avoid timezone day-bit drift.
          daysMask: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
          lessonsByDate: eventDateKey ? { [eventDateKey]: [lesson] } : undefined,
          lessons: [lesson],
        };
      }),
    [t, userTimeZoneId, workerProfile?.workerRole?.productionLineName, workingEvents]
  );

  const getShiftQrState = useCallback((lesson, selectedDate, lessonKey) => {
    const now = new Date();
    const selectedDateKey = toDateKeyInTimeZone(selectedDate, userTimeZoneId);
    const todayKey = toDateKeyInTimeZone(new Date(), userTimeZoneId);
    const isTodayShift = Boolean(selectedDateKey && todayKey && selectedDateKey === todayKey);
    const attendance = String(lesson.attendanceStatus || "").toLowerCase();
    const isCheckedIn = Boolean(lesson.checkinAtUtc) || attendance.includes("checked-in") || attendance.includes("present");
    const isCheckedOut = Boolean(lesson.checkoutAtUtc) || attendance.includes("checked-out") || attendance.includes("completed");

    if (isCheckedOut) {
      return null;
    }

    const isCheckinWindowEligible = (() => {
      const from = parseApiDateTime(lesson.checkinAllowedFromUtc);
      const to = parseApiDateTime(lesson.checkinAllowedToUtc);
      if (!from || !to) {
        return false;
      }
      return now >= from && now <= to;
    })();

    const isCheckoutWindowEligible = (() => {
      const from = parseApiDateTime(lesson.checkoutAllowedFromUtc);
      const to = parseApiDateTime(lesson.checkoutAllowedToUtc);
      if (!from || !to) {
        return false;
      }
      return now >= from && now <= to;
    })();

    const action = isCheckedIn ? "checkout" : "checkin";
    const isCurrentScannerTarget = isScanning && scannerTarget?.lessonKey === lessonKey;
    const isEligibleNow = action === "checkout" ? isCheckoutWindowEligible : isCheckinWindowEligible;

    if ((!isTodayShift || !isEligibleNow) && !isCurrentScannerTarget) {
      return null;
    }

    const nonOperationalAssignments = activeAssignments.filter(
      (a) => a.isActive && a.operationalStatus && a.operationalStatus !== 'OPERATIONAL'
    );
    const hasNonOperationalMachine = nonOperationalAssignments.length > 0;

    return {
      action,
      isCurrentScannerTarget,
      warning: hasNonOperationalMachine
        ? t(K.WORKER_ASSET_NOT_OPERATIONAL, "One or more assigned machines are not operational. QR scanning may be rejected.")
        : null,
      buttonLabel: `${t(K.WORKER_OPEN_CAMERA, "Open Camera")} (${action === "checkin" ? t(K.WORKER_QR_CHECKIN, "Start attendance") : t(K.WORKER_QR_CHECKOUT, "End attendance")})`,
      helperText: action === "checkin"
        ? t(K.WORKER_QR_SCAN_CHECKIN_HINT, "Scan QR code to start attendance for this shift.")
        : t(K.WORKER_QR_SCAN_CHECKOUT_HINT, "Scan QR code to end attendance for this shift."),
    };
  }, [activeAssignments, isScanning, scannerTarget, t, userTimeZoneId]);

  const renderShiftActions = useCallback(({ lesson, lessonKey, selectedDate }) => {
    const qrState = getShiftQrState(lesson, selectedDate, lessonKey);
    if (!qrState) {
      return null;
    }

    return (
      <div className="mt-3 rounded-xl border border-sky-100 bg-white/70 p-3 dark:border-sky-900 dark:bg-navy-800/60">
        {qrState.warning && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800/50 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">⚠ {qrState.warning}</p>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-300">{qrState.helperText}</p>
        <div className="mt-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => (qrState.isCurrentScannerTarget ? stopScanner() : startScanner({ lessonKey, action: qrState.action }))}
            disabled={qrBusy || (!scannerSupported && !qrState.isCurrentScannerTarget)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:text-white"
          >
            {qrState.isCurrentScannerTarget
              ? t(K.WORKER_CLOSE_CAMERA, "Close Camera")
              : qrState.buttonLabel}
          </button>
          <video
            ref={qrState.isCurrentScannerTarget ? videoRef : null}
            className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 ${qrState.isCurrentScannerTarget ? "block" : "hidden"}`}
            muted
            playsInline
            autoPlay
          />
          {qrState.isCurrentScannerTarget && (
            <p className="text-xs text-gray-500 dark:text-gray-300">{t(K.WORKER_QR_SCANNING, "Scanning...")}</p>
          )}
        </div>
      </div>
    );
  }, [getShiftQrState, qrBusy, scannerSupported, startScanner, stopScanner, t]);

  // ── Render: loading / error ────────────────────────────────────────────────

  if (loading) {
    return (
      <PortalLayout titleKey={K.PORTAL_WORKER_NAME} title="Worker Portal">
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">{t(K.WORKER_LOADING, "Loading your data...")}</span>
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout titleKey={K.PORTAL_WORKER_NAME} title="Worker Portal">
        <div className="rounded-xl bg-red-50 p-6 text-center text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      </PortalLayout>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const recentLogs = usageLogs.filter((l) => !(l.notes || "").includes("[WORKING_ATTENDANCE]")).slice(0, 10);
  const activeSessionStart = activeSession ? parseApiDateTime(activeSession.startTime) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PortalLayout titleKey={K.PORTAL_WORKER_NAME} title="Worker Portal">
      <div className="flex flex-1 flex-col min-h-0 gap-5">

        {/* ── Working Calendar ─────────────────────────────────────────────── */}
        <Card extra="p-3 flex-1 min-h-0">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            onActiveMonthChange={handleCalendarActiveMonthChange}
            scheduleItems={calendarScheduleItems}
            events={[]}
            timeZoneId={userTimeZoneId}
            title={t(K.WORKER_WORKING_CALENDAR, "Working Calendar")}
            detailsTitle={t(K.WORKER_WORKING_CALENDAR, "Working Calendar")}
            noEventsText={t(K.WORKER_NO_WORK_EVENTS, "No working shifts on selected date.")}
            scheduleBadgeLabel={t(K.WORKER_SHIFT_LABEL, "Shift")}
            renderLessonActions={renderShiftActions}
            footerContent={
              <div className="pt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-navy-900">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t(K.WORKER_MY_PRODUCTION_LINE, "My Production Line")}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-navy-700 dark:text-white truncate">
                      {workerProfile?.workerRole?.productionLineName || t(K.WORKER_NO_LINE, "No production line assigned")}
                    </p>
                  </div>
                  {workerProfile?.workerRole?.employeeCode && (
                    <div className="rounded-lg bg-brand-50 px-3 py-1.5 dark:bg-brand-900/20">
                      <p className="text-[10px] text-brand-500 dark:text-brand-300">{t(K.WORKER_EMPLOYEE_CODE, "Employee Code")}</p>
                      <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">{workerProfile.workerRole?.employeeCode}</p>
                    </div>
                  )}
                </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowEquipmentModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
                >
                  {activeAssignments.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{activeAssignments.length}</span>
                  )}
                  {t(K.WORKER_MY_EQUIPMENT, "My Equipment")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowActiveSessionModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
                >
                  {activeSession && (
                    <span className="flex h-2 w-2 rounded-full bg-green-500" />
                  )}
                  {t(K.WORKER_ACTIVE_SESSION, "Active Session")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogSessionModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
                >
                  {t(K.WORKER_LOG_SESSION, "Log Session")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUsageHistoryModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
                >
                  {recentLogs.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{recentLogs.length}</span>
                  )}
                  {t(K.WORKER_USAGE_HISTORY, "Usage History")}
                </button>
              </div>
              </div>
            }
          />
        </Card>

      </div>

      {/* ── My Equipment Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        title={t(K.WORKER_MY_EQUIPMENT, "My Equipment")}
        maxWidth="max-w-2xl"
      >
        {activeAssignments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t(K.WORKER_NO_EQUIPMENT, "No equipment currently assigned to you.")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeAssignments.map((a) => (
              <div
                key={a.assignmentID}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-navy-800"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-700 dark:text-white">{a.assetName}</p>
                    <p className="text-xs text-gray-400">{a.assetCode}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge active={a.isActive} />
                    {a.operationalStatus && a.operationalStatus !== 'OPERATIONAL' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        ⚠ {a.operationalStatus}
                      </span>
                    )}
                  </div>
                </div>
                {a.serialNumber && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">S/N: {a.serialNumber}</p>
                )}
                {a.assignedDate && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {t(K.WORKER_ASSIGNED_SINCE, "Assigned since")}{" "}
                    {formatDateInTimeZone(parseApiDateTime(a.assignedDate), userTimeZoneId)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Active Session Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showActiveSessionModal}
        onClose={() => { setShowActiveSessionModal(false); setActiveForm(null); }}
        title={t(K.WORKER_ACTIVE_SESSION, "Active Session")}
        maxWidth="max-w-xl"
      >
        {!activeSession ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t(K.WORKER_NO_ACTIVE_SESSION, "No active session. Start a session below.")}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Equipment</p>
                <p className="font-semibold text-navy-700 dark:text-white">{activeSession.assetName}</p>
                <p className="text-xs text-gray-400">{activeSession.assetCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(K.WORKER_START_TIME, "Start Time")}</p>
                <p className="font-semibold text-navy-700 dark:text-white">
                  {formatDateTimeInTimeZone(activeSessionStart, userTimeZoneId)}
                </p>
              </div>
              {activeSessionStart && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t(K.WORKER_ELAPSED, "Elapsed")}</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatElapsed(activeSessionStart)}
                  </p>
                </div>
              )}
            </div>

            {activeForm !== "end" && (
              <button
                type="button"
                onClick={() => setActiveForm("end")}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {t(K.WORKER_END_SESSION, "End Session")}
              </button>
            )}

            {activeForm === "end" && (
              <form onSubmit={handleEndSession} className="mt-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-navy-900">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t(K.WORKER_END_TIME, "End Time")} *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={endForm.endTime}
                      onChange={(e) => setEndForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t(K.WORKER_RUNNING_MINUTES, "Running Minutes")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={endForm.runningMinutes}
                      onChange={(e) => setEndForm((f) => ({ ...f, runningMinutes: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t(K.WORKER_DOWNTIME_MINUTES, "Downtime Minutes")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={endForm.downtimeMinutes}
                      onChange={(e) => setEndForm((f) => ({ ...f, downtimeMinutes: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      {t(K.WORKER_STITCH_COUNT, "Stitch Count")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={endForm.stitchCount}
                      onChange={(e) => setEndForm((f) => ({ ...f, stitchCount: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t(K.WORKER_NOTES, "Notes")}
                  </label>
                  <textarea
                    rows={2}
                    value={endForm.notes}
                    onChange={(e) => setEndForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {submitting ? "..." : t(K.WORKER_END_SESSION, "End Session")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveForm(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* ── Log Session Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showLogSessionModal}
        onClose={() => { setShowLogSessionModal(false); setActiveForm(null); }}
        title={t(K.WORKER_LOG_SESSION, "Log Session")}
        maxWidth="max-w-lg"
      >
        {activeSession ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t(K.WORKER_NO_ACTIVE_SESSION, "A session is already active. End it before starting a new one.")}
          </p>
        ) : activeAssignments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t(K.WORKER_NO_EQUIPMENT, "No equipment currently assigned to you.")}
          </p>
        ) : activeForm === "start" ? (
          <form onSubmit={handleStartSession} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t(K.WORKER_SELECT_EQUIPMENT, "Select equipment")} *
                </label>
                <select
                  required
                  value={startForm.roomAssetID}
                  onChange={(e) => setStartForm((f) => ({ ...f, roomAssetID: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                >
                  <option value="">{t(K.WORKER_SELECT_EQUIPMENT, "Select equipment")}</option>
                  {activeAssignments.map((a) => (
                    <option key={a.assignmentID} value={a.roomAssetID}>
                      {a.assetName} — {a.assetCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t(K.WORKER_START_TIME, "Start Time")} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startForm.startTime}
                  onChange={(e) => setStartForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? "..." : t(K.WORKER_START_SESSION, "Start Session")}
              </button>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Click <strong>Start Session</strong> to begin logging equipment usage.
            </p>
            <button
              type="button"
              onClick={() => setActiveForm("start")}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {t(K.WORKER_START_SESSION, "Start Session")}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Usage History Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showUsageHistoryModal}
        onClose={() => setShowUsageHistoryModal(false)}
        title={t(K.WORKER_USAGE_HISTORY, "Usage History")}
        maxWidth="max-w-3xl"
      >
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t(K.WORKER_NO_USAGE_HISTORY, "No usage history yet.")}
          </p>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: 480, overflowY: "auto" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Equipment</th>
                  <th className="pb-2 pr-4 font-medium">{t(K.WORKER_START_TIME, "Start Time")}</th>
                  <th className="pb-2 pr-4 font-medium">{t(K.WORKER_END_TIME, "End Time")}</th>
                  <th className="pb-2 pr-4 font-medium">{t(K.WORKER_RUNNING_MINUTES, "Running Min")}</th>
                  <th className="pb-2 font-medium">{t(K.WORKER_DOWNTIME_MINUTES, "Downtime Min")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {recentLogs.map((log) => (
                  <tr key={log.usageLogID} className="text-navy-700 dark:text-white">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{log.assetName}</p>
                      <p className="text-xs text-gray-400">{log.assetCode}</p>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {formatDateTimeInTimeZone(parseApiDateTime(log.startTime), userTimeZoneId)}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {log.endTime
                        ? formatDateTimeInTimeZone(parseApiDateTime(log.endTime), userTimeZoneId)
                        : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span>}
                    </td>
                    <td className="py-2 pr-4 text-xs">{log.runningMinutes ?? "—"}</td>
                    <td className="py-2 text-xs">{log.downtimeMinutes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── QR Checkout — Quantity Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!pendingCheckoutQr}
        onClose={() => { setPendingCheckoutQr(null); setCheckoutQuantity(""); setCheckoutNotes(""); }}
        title="Confirm Work Session Checkout"
        maxWidth="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setPendingCheckoutQr(null); setCheckoutQuantity(""); setCheckoutNotes(""); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCheckoutConfirm}
              disabled={qrBusy}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {qrBusy ? "Submitting..." : "Confirm Checkout"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter the quantity you produced this session (optional).
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Quantity Produced
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={checkoutQuantity}
              onChange={(e) => setCheckoutQuantity(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Quality Notes (optional)
            </label>
            <textarea
              rows={2}
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="Any quality observations..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

    </PortalLayout>
  );
}
