import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import PortalLayout from "layouts/portal";
import { classService, practiceErrorLogService, studentEquipmentAssignmentService } from "services/api";
import assetService from "services/assetService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const STATUS_OPTIONS = [
  { code: "OPERATIONAL", key: K.MAINTAINER_STATUS_OPERATIONAL, fallback: "Operational" },
  { code: "MAINTENANCE", key: K.MAINTAINER_STATUS_MAINTENANCE, fallback: "Under Maintenance" },
  { code: "BROKEN", key: K.MAINTAINER_STATUS_BROKEN, fallback: "Broken" },
  { code: "LOANED", key: K.MAINTAINER_STATUS_LOANED, fallback: "Loaned" },
  { code: "RETIRED", key: K.MAINTAINER_STATUS_RETIRED, fallback: "Retired" },
];

export default function MaintainerPortal() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [statusForm, setStatusForm] = useState({ assetId: "", statusCode: "MAINTENANCE" });

  const openIssues = useMemo(
    () => issues.filter((issue) => !issue.resolutionTime).slice(0, 8),
    [issues]
  );

  // Maintainer calendar: reported incidents only, no class events
  const calendarEvents = useMemo(() =>
    openIssues.map((issue) => ({
      date: issue.errorTime,
      type: "issue",
      label: `${t("MAINTAINER_ISSUE", "Incident")} #${issue.errorLogID}`,
      subtitle: `${t("MAINTAINER_SESSION", "Session")} #${issue.sessionID}`,
    }))
  , [openIssues, t]);

  const showToast = (text, error = false) => {
    setMessage(text);
    setIsError(error);
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
        actualCause: issue.actualCause || t(K.MAINTAINER_DEFAULT_CAUSE, "Machine"),
        resolutionTime: new Date().toISOString(),
        resolutionNotes: issue.resolutionNotes || t(K.MAINTAINER_DEFAULT_RESOLUTION, "Resolved by maintainer workflow."),
      });
      showToast(
        t(K.MAINTAINER_RESOLVE_SUCCESS, "Issue #{id} marked resolved.")
          .replace("{id}", issue.errorLogID)
      );
      await loadData();
    } catch (error) {
      showToast(`${t(K.MAINTAINER_RESOLVE_FAILED, "Issue resolution failed")}: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Maintainer Portal" titleKey={K.MAINTAINER_PORTAL_TITLE}>
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            events={calendarEvents}
            title={t("MAINTAINER_TRAINING_CALENDAR", "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t("MAINTAINER_NO_EVENTS_ON_DATE", "No training events on selected date.")}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
          <div className="mt-4 space-y-3">
            {openIssues.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.MAINTAINER_NO_OPEN_ISSUES, "No open issues right now.")}</p>
            )}
            {openIssues.map((issue) => (
              <div
                key={issue.errorLogID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      {t(K.MAINTAINER_ISSUE_SESSION_LABEL, "Issue")} #{issue.errorLogID} • Session #{issue.sessionID}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                      {issue.studentDescription || t(K.MAINTAINER_NO_DESCRIPTION, "No description")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResolveIssue(issue)}
                    className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    {t(K.MAINTAINER_RESOLVE, "Resolve")}
                  </button>
                </div>
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
