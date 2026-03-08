import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";
import { practiceErrorLogService, studentEquipmentAssignmentService } from "services/api";
import assetService from "services/assetService";

const STATUS_OPTIONS = [
  { code: "OPERATIONAL", label: "Operational" },
  { code: "MAINTENANCE", label: "Under Maintenance" },
  { code: "BROKEN", label: "Broken" },
  { code: "LOANED", label: "Loaned" },
  { code: "RETIRED", label: "Retired" },
];

export default function MaintainerPortal() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [assets, setAssets] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [statusForm, setStatusForm] = useState({ assetId: "", statusCode: "MAINTENANCE" });

  const openIssues = useMemo(
    () => issues.filter((issue) => !issue.resolutionTime).slice(0, 8),
    [issues]
  );

  const showToast = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allAssets, allIssues, active] = await Promise.all([
        assetService.getAllStatuses(),
        practiceErrorLogService.getAll(),
        studentEquipmentAssignmentService.getActive(),
      ]);

      setAssets(allAssets || []);
      setIssues(
        [...(allIssues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setActiveAssignments(active || []);
    } catch (error) {
      showToast(`Failed to load maintainer workspace: ${error.message}`, true);
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
      showToast("Asset status updated.");
      setStatusForm({ assetId: "", statusCode: "MAINTENANCE" });
      await loadData();
    } catch (error) {
      showToast(`Status update failed: ${error.message}`, true);
    }
  };

  const handleResolveIssue = async (issue) => {
    try {
      await practiceErrorLogService.update(issue.errorLogID, {
        actualCause: issue.actualCause || "Machine",
        resolutionTime: new Date().toISOString(),
        resolutionNotes: issue.resolutionNotes || "Resolved by maintainer workflow.",
      });
      showToast(`Issue #${issue.errorLogID} marked resolved.`);
      await loadData();
    } catch (error) {
      showToast(`Issue resolution failed: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Maintainer Portal">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Open Reports</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{openIssues.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Awaiting maintainer decision</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Tracked Assets</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{assets.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">All statuses visible</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Assets In Use</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Protected from risky transitions</p>
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
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Asset Status Control</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Move assets between operational states safely.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleStatusUpdate}>
            <select
              required
              value={statusForm.assetId}
              onChange={(e) => setStatusForm((prev) => ({ ...prev, assetId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.assetID} value={asset.assetID}>
                  {asset.assetCode} • {asset.assetName} • {asset.status || "N/A"}
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
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Apply Status Change
            </button>
          </form>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Open Issue Queue</h2>
          <div className="mt-4 space-y-3">
            {openIssues.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">No open issues right now.</p>
            )}
            {openIssues.map((issue) => (
              <div
                key={issue.errorLogID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      Issue #{issue.errorLogID} • Session #{issue.sessionID}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                      {issue.studentDescription || "No description"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResolveIssue(issue)}
                    className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card extra="mt-6 p-6">
        <h2 className="text-lg font-bold text-navy-700 dark:text-white">Status Distribution</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const count = assets.filter((asset) => asset.status === option.code).length;
            return (
              <div
                key={option.code}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-navy-900 dark:text-gray-300"
              >
                {option.label}: {count}
              </div>
            );
          })}
        </div>
      </Card>
    </PortalLayout>
  );
}
