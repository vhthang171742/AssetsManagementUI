import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Card from "components/card";
import EntityPill from "components/EntityPill";
import RoomPill from "components/RoomPill";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import PortalLayout from "layouts/portal";
import { practiceErrorLogService } from "services/api";
import { assetLifecycleService } from "services/assetLifecycleService";
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import {
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
  formatTimeInTimeZone,
} from "services/dateTimeService";

const STATUS_OPTIONS = [
  { code: "PENDING", key: "MAINTAINER_JOB_STATUS_PENDING", fallback: "Awaiting Technician" },
  { code: "IN_PROGRESS", key: "MAINTAINER_JOB_STATUS_IN_PROGRESS", fallback: "In Progress" },
];

const JOB_STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
};

export default function TechnicianPortal() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const userTimeZoneId = currentUser?.timeZoneId || "";

  const [issues, setIssues] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [resolutionCategories, setResolutionCategories] = useState([]);
  const [activeForm, setActiveForm] = useState({ jobId: null, type: null }); // type: "resolve" | "decommission"
  const [resolveForm, setResolveForm] = useState({ resolutionNotes: "" });
  const [decommissionForm, setDecommissionForm] = useState({ reason: "" });

  // Technician calendar: incidents only.
  const scheduleItems = useMemo(() => [], []);

  const openIssues = useMemo(
    () => issues.filter((issue) => !issue.resolutionTime).slice(0, 8),
    [issues]
  );

  const calendarEvents = useMemo(() =>
    openIssues.map((issue) => ({
      date: issue.errorTime,
      type: "issue",
      label: issue.assetCode ? issue.assetCode : `${t("MAINTAINER_ISSUE", "Incident")} #${issue.errorLogID}`,
      subtitle: issue.assetCode ? `${t("MAINTAINER_ISSUE", "Incident")} #${issue.errorLogID}` : `${t("MAINTAINER_SESSION", "Session")} #${issue.sessionID}`,
      category: issue.errorType || null,
      time: issue.errorTime ? formatTimeInTimeZone(issue.errorTime, userTimeZoneId) : null,
      reporter: issue.reporterName || null,
      room: issue.roomName || null,
    }))
  , [openIssues, t, userTimeZoneId]);

  const showToast = (text, error = false) => {
    if (error) toast.error(text);
    else toast.success(text);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allIssues, jobs] = await Promise.all([
        practiceErrorLogService.getAll(),
        assetLifecycleService.getOpenJobs(),
      ]);

      setIssues(
        [...(allIssues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setOpenJobs(jobs || []);
    } catch (error) {
      showToast(`${t(K.MAINTAINER_LOAD_FAILED, "Failed to load maintainer workspace")}: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const PERMANENT_RESOLUTION_CATEGORIES = [
      { itemCode: "REPLACED_HARDWARE", label: "Replaced Hardware" },
      { itemCode: "REINSTALLED_SOFTWARE", label: "Reinstalled Software" },
      { itemCode: "RESTARTED_DEVICE", label: "Restarted Device" },
      { itemCode: "RECONFIGURED", label: "Reconfigured Settings" },
      { itemCode: "CLEANED", label: "Cleaned / Serviced" },
      { itemCode: "REFERRED_TO_VENDOR", label: "Referred to Vendor" },
      { itemCode: "NO_ACTION_NEEDED", label: "No Action Needed" },
      { itemCode: "OTHER", label: "Other" },
    ];

    configurationService.getItems("ResolutionType", language).then((items) => {
      const configItems = (items || []).map((item) => ({
        itemCode: item.itemCode,
        label: item.label || item.itemCode,
      }));
      const merged = [...PERMANENT_RESOLUTION_CATEGORIES];
      configItems.forEach((ci) => {
        if (!merged.find((m) => m.itemCode === ci.itemCode)) {
          merged.push(ci);
        }
      });
      setResolutionCategories(merged);
    }).catch(() => {
      setResolutionCategories(PERMANENT_RESOLUTION_CATEGORIES);
    });
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (!dateParam) return;
    const parsed = new Date(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      setCalendarDate(parsed);
    }
  }, [location.search]);

  const handleStartWork = async (jobId) => {
    try {
      await assetLifecycleService.startWork(jobId);
      showToast(t("MAINTAINER_START_WORK_SUCCESS", "Work started. Asset is now Under Maintenance."));
      await loadData();
    } catch (error) {
      showToast(`${t("MAINTAINER_START_WORK_FAILED", "Failed to start work")}: ${error.message}`, true);
    }
  };

  const handleResolveJob = async (jobId) => {
    try {
      await assetLifecycleService.resolve(jobId, resolveForm.resolutionNotes);
      showToast(t("MAINTAINER_RESOLVE_SUCCESS_LIFECYCLE", "Job resolved. Asset is now Operational."));
      setActiveForm({ jobId: null, type: null });
      setResolveForm({ resolutionNotes: "" });
      await loadData();
    } catch (error) {
      showToast(`${t(K.MAINTAINER_RESOLVE_FAILED, "Issue resolution failed")}: ${error.message}`, true);
    }
  };

  const handleDecommission = async (jobId) => {
    try {
      await assetLifecycleService.decommission(jobId, decommissionForm.reason);
      showToast(t("MAINTAINER_DECOMMISSION_SUCCESS", "Asset has been decommissioned."));
      setActiveForm({ jobId: null, type: null });
      setDecommissionForm({ reason: "" });
      await loadData();
    } catch (error) {
      showToast(`${t("MAINTAINER_DECOMMISSION_FAILED", "Decommission failed")}: ${error.message}`, true);
    }
  };

  const jobStatusLabel = (status) => {
    if (status === "PENDING") return t("MAINTAINER_JOB_STATUS_PENDING", "Awaiting Technician");
    if (status === "IN_PROGRESS") return t("MAINTAINER_JOB_STATUS_IN_PROGRESS", "In Progress");
    return status;
  };

  const jobTypeLabel = (type) => {
    if (type === "INCIDENT") return t("MAINTAINER_JOB_INCIDENT", "Incident");
    if (type === "SCHEDULED") return t("MAINTAINER_JOB_SCHEDULED", "Scheduled");
    return type;
  };

  return (
    <PortalLayout title="Technician Portal" titleKey={K.MAINTAINER_PORTAL_TITLE}>
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            scheduleItems={scheduleItems}
            events={calendarEvents}
            timeZoneId={userTimeZoneId}
            title={t("MAINTAINER_INCIDENT_CALENDAR", "Incident Calendar")}
            detailsTitle={t("MAINTAINER_INCIDENT_DETAILS", "Incident Details")}
            noEventsText={t("MAINTAINER_NO_EVENTS_ON_DATE", "No incidents on selected date.")}
          />
        </Card>
      </div>

      {/* Open Issue / Maintenance Job Queue — full width */}
      <div className="mt-6">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.MAINTAINER_OPEN_ISSUE_QUEUE, "Open Issue Queue")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t("MAINTAINER_QUEUE_HINT", "Shows both incident-triggered and scheduled maintenance jobs. Click actions to progress each job through the workflow.")}
          </p>
          <div className="mt-4 space-y-4">
            {openJobs.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_NO_OPEN_ISSUES, "No open issues right now.")}</p>
            )}
            {openJobs.map((job) => (
              <div
                key={job.jobID}
                className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-navy-900"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">
                      {t("MAINTAINER_JOB_LABEL", "Job")} #{job.jobID}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${JOB_STATUS_COLORS[job.jobStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {jobStatusLabel(job.jobStatus)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-navy-700 dark:text-gray-300">
                      {jobTypeLabel(job.jobType)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {job.jobStatus === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleStartWork(job.jobID)}
                        className="rounded-lg border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        {t("MAINTAINER_START_WORK", "Start Work")}
                      </button>
                    )}
                    {job.jobStatus === "IN_PROGRESS" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveForm((prev) =>
                              prev.jobId === job.jobID && prev.type === "resolve"
                                ? { jobId: null, type: null }
                                : { jobId: job.jobID, type: "resolve" }
                            )
                          }
                          className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        >
                          {t(K.MAINTAINER_RESOLVE, "Resolve")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveForm((prev) =>
                              prev.jobId === job.jobID && prev.type === "decommission"
                                ? { jobId: null, type: null }
                                : { jobId: job.jobID, type: "decommission" }
                            )
                          }
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {t("MAINTAINER_DECOMMISSION", "Decommission")}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 md:grid-cols-3">
                  {job.assetCode && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{t(K.MAINTAINER_ASSET_LABEL, "Asset")}:</span>
                      <EntityPill type="asset" id={job.assetID} label={job.assetCode} />
                      {job.assetName && <span>— {job.assetName}</span>}
                    </div>
                  )}
                  {job.roomName && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_ROOM_LABEL, "Room")}:</span>{" "}
                      <RoomPill roomId={job.roomID || null} label={job.roomName} roomName={job.roomName} />
                    </div>
                  )}
                  {job.reporterName && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_REPORTER, "Reporter")}:</span>{" "}
                      {job.reporterName}
                    </div>
                  )}
                  {job.assignedTechnicianName && (
                    <div>
                      <span className="font-semibold">{t("MAINTAINER_ASSIGNED_TO", "Assigned")}:</span>{" "}
                      {job.assignedTechnicianName}
                    </div>
                  )}
                  {job.expectedBy && (
                    <div>
                      <span className="font-semibold">{t("MAINTAINER_SLA_DUE", "SLA Due")}:</span>{" "}
                      {formatDateInTimeZone(job.expectedBy, userTimeZoneId)}
                    </div>
                  )}
                  {job.createdAt && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_DATETIME_LABEL, "Reported at")}:</span>{" "}
                      {formatDateTimeInTimeZone(job.createdAt, userTimeZoneId, { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  )}
                </div>

                {/* Description */}
                {job.description && (
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">{job.description}</p>
                )}

                {/* Resolve form */}
                {activeForm.jobId === job.jobID && activeForm.type === "resolve" && (
                  <div className="mt-3 space-y-2 border-t border-red-200 pt-3 dark:border-red-900/40">
                    <p className="text-xs font-semibold text-navy-700 dark:text-white">
                      {t(K.MAINTAINER_RESOLUTION_FORM_TITLE, "Resolve Incident")}
                    </p>
                    <select
                      value={resolveForm.resolutionNotes}
                      onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
                    >
                      <option value="">{t(K.MAINTAINER_SELECT_RESOLUTION, "Select resolution type")}</option>
                      {resolutionCategories.map((cat) => (
                        <option key={cat.itemCode} value={cat.itemCode}>{cat.label}</option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      value={resolveForm.resolutionNotes}
                      onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                      placeholder={t(K.MAINTAINER_RESOLUTION_DETAIL_PLACEHOLDER, "Describe exactly what was done to fix the issue...")}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveJob(job.jobID)}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        {t(K.MAINTAINER_SUBMIT_RESOLUTION, "Mark as Resolved")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveForm({ jobId: null, type: null }); setResolveForm({ resolutionNotes: "" }); }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-navy-700"
                      >
                        {t(K.MAINTAINER_CANCEL, "Cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Decommission form */}
                {activeForm.jobId === job.jobID && activeForm.type === "decommission" && (
                  <div className="mt-3 space-y-2 border-t border-red-200 pt-3 dark:border-red-900/40">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {t("MAINTAINER_DECOMMISSION_FORM_TITLE", "Decommission Asset")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("MAINTAINER_DECOMMISSION_WARNING", "This action is irreversible. The asset will be permanently retired.")}
                    </p>
                    <textarea
                      rows={3}
                      value={decommissionForm.reason}
                      onChange={(e) => setDecommissionForm({ reason: e.target.value })}
                      placeholder={t("MAINTAINER_DECOMMISSION_REASON_PLACEHOLDER", "State the reason for decommissioning this asset...")}
                      className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs focus:border-red-500 focus:outline-none dark:border-red-900/40 dark:bg-navy-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecommission(job.jobID)}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        {t("MAINTAINER_CONFIRM_DECOMMISSION", "Confirm Decommission")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveForm({ jobId: null, type: null }); setDecommissionForm({ reason: "" }); }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-navy-700"
                      >
                        {t(K.MAINTAINER_CANCEL, "Cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card extra="mt-6 p-6">
        <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.MAINTAINER_STATUS_DISTRIBUTION, "Status Distribution")}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const count = openJobs.filter((job) => job.jobStatus === option.code).length;
            return (
              <div
                key={option.code}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-navy-900 dark:text-gray-300"
              >
                {t(option.key, option.fallback)}: {count}
              </div>
            );
          })}
        </div>
      </Card>
    </PortalLayout>
  );
}