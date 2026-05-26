import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Card from "components/card";
import Modal from "components/modal/Modal";
import PortalLayout from "layouts/portal";
import { workSessionService } from "services/workSessionService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

// ─── Helpers ────────────────────────────────────────────────────────────────

const APPROVAL_STATUS = { Pending: 0, Approved: 1, Rejected: 2 };

function durationLabel(session) {
  if (!session.startTime) return "—";
  const end = session.endTime ? new Date(session.endTime) : new Date();
  const mins = Math.round((end - new Date(session.startTime)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function ApprovalBadge({ status }) {
  const map = { 0: ["Pending", "bg-yellow-100 text-yellow-800"], 1: ["Approved", "bg-green-100 text-green-800"], 2: ["Rejected", "bg-red-100 text-red-800"] };
  const [label, cls] = map[status] ?? ["Unknown", "bg-gray-100 text-gray-600"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProductionManagerPortal() {
  const { t } = useLanguage();

  const [activeSessions, setActiveSessions] = useState([]);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);

  const [forceCloseTarget, setForceCloseTarget] = useState(null);
  const [forceCloseReason, setForceCloseReason] = useState("");
  const [forceCloseBusy, setForceCloseBusy] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveBusy, setApproveBusy] = useState({});

  const loadActiveSessions = useCallback(async () => {
    setLoadingActive(true);
    try {
      const data = await workSessionService.getSessions({ activeOnly: true });
      setActiveSessions(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      toast.error(`Failed to load active sessions: ${err?.message || "Unknown error"}`);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const loadPendingSessions = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await workSessionService.getSessions({ approvalStatus: APPROVAL_STATUS.Pending });
      setPendingSessions(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      toast.error(`Failed to load pending sessions: ${err?.message || "Unknown error"}`);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadActiveSessions();
    loadPendingSessions();
  }, [loadActiveSessions, loadPendingSessions]);

  const handleForceClose = async () => {
    if (!forceCloseTarget || !forceCloseReason.trim()) {
      toast.error("Please enter a reason for force-closing this session.");
      return;
    }
    setForceCloseBusy(true);
    try {
      await workSessionService.forceClose(forceCloseTarget.workSessionID, forceCloseReason.trim());
      toast.success("Session force-closed.");
      setForceCloseTarget(null);
      setForceCloseReason("");
      await loadActiveSessions();
    } catch (err) {
      toast.error(`Failed to force-close: ${err?.message || "Unknown error"}`);
    } finally {
      setForceCloseBusy(false);
    }
  };

  const handleApprove = async (session) => {
    setApproveBusy((b) => ({ ...b, [session.workSessionID]: "approve" }));
    try {
      await workSessionService.approve(session.workSessionID);
      toast.success(`Session approved. +${Math.floor(session.quantityProduced ?? 0)} units added.`);
      await loadPendingSessions();
    } catch (err) {
      toast.error(`Failed to approve: ${err?.message || "Unknown error"}`);
    } finally {
      setApproveBusy((b) => ({ ...b, [session.workSessionID]: null }));
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    if (!rejectNotes.trim()) {
      toast.error("Please enter rejection notes.");
      return;
    }
    setApproveBusy((b) => ({ ...b, [rejectTarget.workSessionID]: "reject" }));
    try {
      await workSessionService.reject(rejectTarget.workSessionID, rejectNotes.trim());
      toast.success("Session rejected.");
      setRejectTarget(null);
      setRejectNotes("");
      await loadPendingSessions();
    } catch (err) {
      toast.error(`Failed to reject: ${err?.message || "Unknown error"}`);
    } finally {
      setApproveBusy((b) => ({ ...b, [rejectTarget?.workSessionID]: null }));
    }
  };

  return (
    <PortalLayout titleKey={K.PORTAL_PRODUCTION_MANAGER_NAME} title="Production Manager Portal">
      <div className="flex flex-1 flex-col min-h-0 gap-5">

        {/* ── Active Sessions ───────────────────────────────────────────────── */}
        <Card extra="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-700 dark:text-white">
              Live — Active Sessions
              {activeSessions.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                  {activeSessions.length}
                </span>
              )}
            </h2>
            <button
              onClick={loadActiveSessions}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>

          {loadingActive ? (
            <p className="py-4 text-sm text-gray-400">Loading...</p>
          ) : activeSessions.length === 0 ? (
            <p className="py-4 text-sm text-gray-400 dark:text-gray-500">No workers currently checked in.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Worker</th>
                    <th className="pb-2 pr-4 font-medium">Step</th>
                    <th className="pb-2 pr-4 font-medium">Asset</th>
                    <th className="pb-2 pr-4 font-medium">Started</th>
                    <th className="pb-2 pr-4 font-medium">Elapsed</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {activeSessions.map((s) => (
                    <tr key={s.workSessionID} className="text-navy-700 dark:text-white">
                      <td className="py-2 pr-4">
                        <p className="font-medium">{s.workerName || "—"}</p>
                        <p className="text-xs text-gray-400">{s.employeeCode || ""}</p>
                      </td>
                      <td className="py-2 pr-4 text-xs">{s.stepName || s.stepCode || "—"}</td>
                      <td className="py-2 pr-4 text-xs">{s.assetName || s.qrCodeValue || "—"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {s.startTime ? new Date(s.startTime).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs font-semibold text-green-600">{durationLabel(s)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => { setForceCloseTarget(s); setForceCloseReason(""); }}
                          className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Force Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Pending Approvals ─────────────────────────────────────────────── */}
        <Card extra="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-700 dark:text-white">
              Pending Approvals
              {pendingSessions.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">
                  {pendingSessions.length}
                </span>
              )}
            </h2>
            <button
              onClick={loadPendingSessions}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>

          {loadingPending ? (
            <p className="py-4 text-sm text-gray-400">Loading...</p>
          ) : pendingSessions.length === 0 ? (
            <p className="py-4 text-sm text-gray-400 dark:text-gray-500">No sessions awaiting approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Worker</th>
                    <th className="pb-2 pr-4 font-medium">Step</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Duration</th>
                    <th className="pb-2 pr-4 font-medium">Qty Produced</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {pendingSessions.map((s) => {
                    const busy = approveBusy[s.workSessionID];
                    return (
                      <tr key={s.workSessionID} className="text-navy-700 dark:text-white">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{s.workerName || "—"}</p>
                          <p className="text-xs text-gray-400">{s.employeeCode || ""}</p>
                        </td>
                        <td className="py-2 pr-4 text-xs">{s.stepName || s.stepCode || "—"}</td>
                        <td className="py-2 pr-4 text-xs">
                          {s.startTime ? new Date(s.startTime).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs">{durationLabel(s)}</td>
                        <td className="py-2 pr-4 text-xs font-semibold">
                          {s.quantityProduced != null ? Number(s.quantityProduced).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <ApprovalBadge status={s.approvalStatus} />
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(s)}
                              disabled={!!busy}
                              className="rounded border border-green-300 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:text-green-400"
                            >
                              {busy === "approve" ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => { setRejectTarget(s); setRejectNotes(""); }}
                              disabled={!!busy}
                              className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400"
                            >
                              {busy === "reject" ? "..." : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {/* ── Force Close Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!forceCloseTarget}
        onClose={() => { setForceCloseTarget(null); setForceCloseReason(""); }}
        title="Force Close Session"
        maxWidth="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setForceCloseTarget(null); setForceCloseReason(""); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForceClose}
              disabled={forceCloseBusy}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {forceCloseBusy ? "Closing..." : "Force Close"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {forceCloseTarget && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Closing session for <strong>{forceCloseTarget.workerName || "worker"}</strong> on{" "}
              <strong>{forceCloseTarget.stepName || "this step"}</strong>.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Reason *
            </label>
            <textarea
              rows={3}
              value={forceCloseReason}
              onChange={(e) => setForceCloseReason(e.target.value)}
              placeholder="Enter reason for force-closing..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectNotes(""); }}
        title="Reject Work Session"
        maxWidth="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setRejectTarget(null); setRejectNotes(""); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={!!(rejectTarget && approveBusy[rejectTarget.workSessionID])}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {rejectTarget && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Rejecting session for <strong>{rejectTarget.workerName || "worker"}</strong> —{" "}
              qty: <strong>{rejectTarget.quantityProduced ?? 0}</strong>.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Rejection Notes *
            </label>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-800 dark:text-white"
              autoFocus
            />
          </div>
        </div>
      </Modal>

    </PortalLayout>
  );
}

