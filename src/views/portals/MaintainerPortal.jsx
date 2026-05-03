import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Card from "components/card";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import PortalLayout from "layouts/portal";
import { classService, practiceErrorLogService, studentEquipmentAssignmentService } from "services/api";
import assetService from "services/assetService";
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const STATUS_OPTIONS = [
  { code: "OPERATIONAL", key: K.MAINTAINER_STATUS_OPERATIONAL, fallback: "Operational" },
  { code: "MAINTENANCE", key: K.MAINTAINER_STATUS_MAINTENANCE, fallback: "Under Maintenance" },
  { code: "BROKEN", key: K.MAINTAINER_STATUS_BROKEN, fallback: "Broken" },
  { code: "LOANED", key: K.MAINTAINER_STATUS_LOANED, fallback: "Loaned" },
  { code: "RETIRED", key: K.MAINTAINER_STATUS_RETIRED, fallback: "Retired" },
];

export default function TechnicianPortal() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [statusForm, setStatusForm] = useState({ assetId: "", statusCode: "MAINTENANCE" });
  const [resolutionCategories, setResolutionCategories] = useState([]);
  const [resolveForm, setResolveForm] = useState({ issueId: null, resolutionType: "", resolutionDetail: "" });

  const openIssues = useMemo(
    () => issues.filter((issue) => !issue.resolutionTime).slice(0, 8),
    [issues]
  );

  // Technician calendar: class schedule items (full period, past & future) + reported incidents
  const scheduleItems = useMemo(() =>
    classes.map((cls) => ({
      id: cls.classID,
      name: cls.className,
      courseName: cls.courseName || cls.className,
      room: cls.roomName || "",
      startDate: cls.startDate,
      endDate: cls.endDate,
      daysMask: cls.scheduleDaysMask || 0,
      lessons: cls.scheduleStartTime || cls.scheduleEndTime
        ? [{ startTime: cls.scheduleStartTime || "", endTime: cls.scheduleEndTime || "" }]
        : [],
    }))
  , [classes]);

  const calendarEvents = useMemo(() =>
    openIssues.map((issue) => ({
      date: issue.errorTime,
      type: "issue",
      label: `${t("MAINTAINER_ISSUE", "Incident")} #${issue.errorLogID}`,
      subtitle: `${t("MAINTAINER_SESSION", "Session")} #${issue.sessionID}`,
      category: issue.errorType || null,
      time: issue.errorTime ? new Date(issue.errorTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
      reporter: issue.reporterName || null,
      room: issue.roomName || null,
    }))
  , [openIssues, t]);

  const showToast = (text, error = false) => {
    if (error) toast.error(text);
    else toast.success(text);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allAssets, allIssues, active, classList] = await Promise.all([
        assetService.getAllStatuses(),
        practiceErrorLogService.getAll(),
        studentEquipmentAssignmentService.getActive(),
        classService.getActive(),
      ]);

      setAssets(allAssets || []);
      setIssues(
        [...(allIssues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setActiveAssignments(active || []);
      setClasses(classList || []);
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
    if (!dateParam) {
      return;
    }

    const parsed = new Date(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      setCalendarDate(parsed);
    }
  }, [location.search]);

  const handleStatusUpdate = async (event) => {
    event.preventDefault();
    try {
      await assetService.updateStatus(Number(statusForm.assetId), statusForm.statusCode);
      showToast(t(K.MAINTAINER_STATUS_UPDATED, "Asset status updated."));
      setStatusForm({ assetId: "", statusCode: "MAINTENANCE" });
      await loadData();
    } catch (error) {
      showToast(`${t(K.MAINTAINER_STATUS_UPDATE_FAILED, "Status update failed")}: ${error.message}`, true);
    }
  };

  const handleResolveIssue = async (issue) => {
    try {
      await practiceErrorLogService.update(issue.errorLogID, {
        actualCause: resolveForm.resolutionType || issue.actualCause || t(K.MAINTAINER_DEFAULT_CAUSE, "Machine"),
        resolutionTime: new Date().toISOString(),
        resolutionNotes: resolveForm.resolutionDetail || issue.resolutionNotes || t(K.MAINTAINER_DEFAULT_RESOLUTION, "Resolved by maintainer workflow."),
      });
      showToast(
        t(K.MAINTAINER_RESOLVE_SUCCESS, "Issue #{id} marked resolved.")
          .replace("{id}", issue.errorLogID)
      );
      setResolveForm({ issueId: null, resolutionType: "", resolutionDetail: "" });
      await loadData();
    } catch (error) {
      showToast(`${t(K.MAINTAINER_RESOLVE_FAILED, "Issue resolution failed")}: ${error.message}`, true);
    }
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
            title={t("MAINTAINER_TRAINING_CALENDAR", "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t("MAINTAINER_NO_EVENTS_ON_DATE", "No training events on selected date.")}
          />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_OPEN_REPORTS, "Open Reports")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{openIssues.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_AWAITING_DECISION, "Awaiting maintainer decision")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_TRACKED_ASSETS, "Tracked Assets")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{assets.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_ALL_STATUSES_VISIBLE, "All statuses visible")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_ASSETS_IN_USE, "Assets In Use")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_PROTECTED_TRANSITIONS, "Protected from risky transitions")}</p>
        </Card>
      </div>

      {/* message removed — now using react-hot-toast */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.MAINTAINER_STATUS_CONTROL_TITLE, "Asset Status Control")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.MAINTAINER_STATUS_CONTROL_HINT, "Move assets between operational states safely.")}
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleStatusUpdate}>
            <select
              required
              value={statusForm.assetId}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, assetId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.MAINTAINER_SELECT_ASSET, "Select asset")}</option>
              {assets.map((asset) => (
                <option key={asset.assetID} value={asset.assetID}>
                  {asset.assetCode} • {asset.assetName} • {asset.status || t(K.MAINTAINER_NA, "N/A")}
                </option>
              ))}
            </select>

            <select
              required
              value={statusForm.statusCode}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, statusCode: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {t(K.MAINTAINER_APPLY_STATUS, "Apply Status Change")}
            </button>
          </form>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.MAINTAINER_OPEN_ISSUE_QUEUE, "Open Issue Queue")}</h2>
          <div className="mt-4 space-y-4">
            {openIssues.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_NO_OPEN_ISSUES, "No open issues right now.")}</p>
            )}
            {openIssues.map((issue) => (
              <div
                key={issue.errorLogID}
                className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-navy-900"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">
                    {t(K.MAINTAINER_ISSUE_SESSION_LABEL, "Issue")} #{issue.errorLogID}
                    {issue.errorType && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/50 dark:text-red-300">
                        {issue.errorType}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setResolveForm((prev) =>
                        prev.issueId === issue.errorLogID
                          ? { issueId: null, resolutionType: "", resolutionDetail: "" }
                          : { issueId: issue.errorLogID, resolutionType: "", resolutionDetail: "" }
                      )
                    }
                    className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    {t(K.MAINTAINER_RESOLVE, "Resolve")}
                  </button>
                </div>

                {/* Meta info grid */}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-semibold">{t(K.MAINTAINER_DATETIME_LABEL, "Reported at")}:</span>{" "}
                    {issue.errorTime ? new Date(issue.errorTime).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short", hour12: false }) : t(K.MAINTAINER_NA, "N/A")}
                  </div>
                  <div>
                    <span className="font-semibold">{t("MAINTAINER_SESSION", "Session")} #:</span>{" "}
                    {issue.sessionID}
                  </div>
                  {issue.reporterName && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_REPORTER, "Reporter")}:</span>{" "}
                      {issue.reporterName}
                    </div>
                  )}
                  {issue.roomName && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_ROOM_LABEL, "Room")}:</span>{" "}
                      {issue.roomName}
                    </div>
                  )}
                  {issue.assetCode && (
                    <div>
                      <span className="font-semibold">{t(K.MAINTAINER_ASSET_LABEL, "Asset")}:</span>{" "}
                      {issue.assetCode}
                    </div>
                  )}
                </div>

                {/* Description */}
                {issue.studentDescription && (
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                    {issue.studentDescription}
                  </p>
                )}

                {/* Inline resolve form */}
                {resolveForm.issueId === issue.errorLogID && (
                  <div className="mt-3 space-y-2 border-t border-red-200 pt-3 dark:border-red-900/40">
                    <p className="text-xs font-semibold text-navy-700 dark:text-white">
                      {t(K.MAINTAINER_RESOLUTION_FORM_TITLE, "Resolve Incident")}
                    </p>
                    <select
                      value={resolveForm.resolutionType}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, resolutionType: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
                    >
                      <option value="">{t(K.MAINTAINER_SELECT_RESOLUTION, "Select resolution type")}</option>
                      {resolutionCategories.map((cat) => (
                        <option key={cat.itemCode} value={cat.itemCode}>{cat.label}</option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      value={resolveForm.resolutionDetail}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, resolutionDetail: e.target.value }))}
                      placeholder={t(K.MAINTAINER_RESOLUTION_DETAIL_PLACEHOLDER, "Describe exactly what was done to fix the issue...")}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveIssue(issue)}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        {t(K.MAINTAINER_SUBMIT_RESOLUTION, "Mark as Resolved")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolveForm({ issueId: null, resolutionType: "", resolutionDetail: "" })}
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
            const count = assets.filter((asset) => asset.status === option.code).length;
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
