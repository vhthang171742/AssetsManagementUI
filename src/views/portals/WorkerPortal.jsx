import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import Card from "components/card";
import PortalLayout from "layouts/portal";
import { workerEquipmentService, equipmentUsageService } from "services";
import { httpClient } from "services/httpClient";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { formatDateInTimeZone, formatDateTimeInTimeZone, parseApiDateTime } from "services/dateTimeService";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatElapsed(startDate) {
  const diffMs = Date.now() - startDate.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

  // Active session (first open log — no endTime)
  const activeSession = usageLogs.find((l) => !l.endTime) || null;

  // Form state
  const [startForm, setStartForm] = useState({ roomAssetID: "", startTime: "" });
  const [endForm, setEndForm] = useState({ endTime: "", runningMinutes: "", downtimeMinutes: "", stitchCount: "", notes: "" });
  const [activeForm, setActiveForm] = useState(null); // "start" | "end" | null
  const [submitting, setSubmitting] = useState(false);

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

  const activeAssignments = assignments.filter((a) => a.isActive);
  const recentLogs = usageLogs.slice(0, 10);
  const activeSessionStart = activeSession ? parseApiDateTime(activeSession.startTime) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PortalLayout titleKey={K.PORTAL_WORKER_NAME} title="Worker Portal">
      <div className="space-y-6">

        {/* ── Production Line Info ─────────────────────────────────────────── */}
        <Card extra="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t(K.WORKER_MY_PRODUCTION_LINE, "My Production Line")}
              </p>
              <p className="mt-0.5 text-xl font-bold text-navy-700 dark:text-white">
                {workerProfile?.workerRole?.productionLineName || t(K.WORKER_NO_LINE, "No production line assigned")}
              </p>
            </div>
            {workerProfile?.workerRole?.employeeCode && (
              <div className="rounded-lg bg-brand-50 px-4 py-2 dark:bg-brand-900/20">
                <p className="text-xs text-brand-500 dark:text-brand-300">{t(K.WORKER_EMPLOYEE_CODE, "Employee Code")}</p>
                <p className="font-semibold text-brand-700 dark:text-brand-200">{workerProfile.workerRole?.employeeCode}</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── My Equipment ─────────────────────────────────────────────────── */}
        <Card extra="p-5">
          <h3 className="mb-4 text-base font-bold text-navy-700 dark:text-white">
            {t(K.WORKER_MY_EQUIPMENT, "My Equipment")}
          </h3>
          {activeAssignments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t(K.WORKER_NO_EQUIPMENT, "No equipment currently assigned to you.")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <StatusBadge active={a.isActive} />
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
        </Card>

        {/* ── Active Session ───────────────────────────────────────────────── */}
        <Card extra="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-700 dark:text-white">
              {t(K.WORKER_ACTIVE_SESSION, "Active Session")}
            </h3>
            {activeSession && activeForm !== "end" && (
              <button
                onClick={() => setActiveForm("end")}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {t(K.WORKER_END_SESSION, "End Session")}
              </button>
            )}
          </div>

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

              {/* End Session Form */}
              {activeForm === "end" && (
                <form onSubmit={handleEndSession} className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-navy-900">
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
        </Card>

        {/* ── Start New Session ────────────────────────────────────────────── */}
        {!activeSession && (
          <Card extra="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-700 dark:text-white">
                {t(K.WORKER_LOG_SESSION, "Log Session")}
              </h3>
              {activeForm !== "start" && activeAssignments.length > 0 && (
                <button
                  onClick={() => setActiveForm("start")}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                >
                  {t(K.WORKER_START_SESSION, "Start Session")}
                </button>
              )}
            </div>

            {activeAssignments.length === 0 ? (
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
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Click <strong>Start Session</strong> to begin logging equipment usage.
              </p>
            )}
          </Card>
        )}

        {/* ── Usage History ────────────────────────────────────────────────── */}
        <Card extra="p-5">
          <h3 className="mb-4 text-base font-bold text-navy-700 dark:text-white">
            {t(K.WORKER_USAGE_HISTORY, "Usage History")}
          </h3>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t(K.WORKER_NO_USAGE_HISTORY, "No usage history yet.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
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
        </Card>

      </div>
    </PortalLayout>
  );
}
