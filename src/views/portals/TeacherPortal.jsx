import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";
import {
  classService,
  studentEquipmentAssignmentService,
  practiceErrorLogService,
} from "services/api";
import assetService from "services/assetService";
import { getCurrentUser } from "services/userService";

export default function TeacherPortal() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [classes, setClasses] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);

  const [assignForm, setAssignForm] = useState({
    studentID: "",
    classID: "",
    roomAssetID: "",
  });

  const [issueForm, setIssueForm] = useState({
    sessionID: "",
    studentDescription: "",
  });

  const visibleAssignments = useMemo(
    () => activeAssignments.slice(0, 6),
    [activeAssignments]
  );

  const visibleIssues = useMemo(() => recentIssues.slice(0, 6), [recentIssues]);

  const showToast = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const instructorId = currentUser?.instructorRole?.instructorID;

      const [available, active, issues, classList] = await Promise.all([
        assetService.getAvailableForTraining(),
        studentEquipmentAssignmentService.getActive(),
        practiceErrorLogService.getAll(),
        instructorId ? classService.getByInstructor(instructorId) : classService.getActive(),
      ]);

      setAvailableAssets(available || []);
      setActiveAssignments(active || []);
      setRecentIssues(
        [...(issues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setClasses(classList || []);
    } catch (error) {
      showToast(`Failed to load teacher workspace: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignAsset = async (event) => {
    event.preventDefault();
    try {
      await studentEquipmentAssignmentService.create({
        studentID: Number(assignForm.studentID),
        classID: Number(assignForm.classID),
        roomAssetID: Number(assignForm.roomAssetID),
        assignedDate: new Date().toISOString(),
        isActive: true,
      });
      setAssignForm({ studentID: "", classID: "", roomAssetID: "" });
      showToast("Asset assigned successfully.");
      await loadData();
    } catch (error) {
      showToast(`Assignment failed: ${error.message}`, true);
    }
  };

  const handleUnassign = async (assignmentId) => {
    try {
      await studentEquipmentAssignmentService.unassign(assignmentId);
      showToast("Asset unassigned.");
      await loadData();
    } catch (error) {
      showToast(`Unassign failed: ${error.message}`, true);
    }
  };

  const handleIssueReport = async (event) => {
    event.preventDefault();
    try {
      await practiceErrorLogService.create({
        sessionID: Number(issueForm.sessionID),
        errorTime: new Date().toISOString(),
        studentDescription: issueForm.studentDescription,
        instructorNotified: true,
      });
      setIssueForm({ sessionID: "", studentDescription: "" });
      showToast("Issue reported successfully.");
      await loadData();
    } catch (error) {
      showToast(`Issue report failed: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Teacher Portal">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Available Assets</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{availableAssets.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Good condition and ready for use</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Active Assignments</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Currently in student hands</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Open Reports</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">
            {recentIssues.filter((issue) => !issue.resolutionTime).length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Teacher/student reported issues</p>
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
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Assign Asset to Student</h2>
          <form className="mt-4 space-y-3" onSubmit={handleAssignAsset}>
            <input
              type="number"
              min="1"
              required
              value={assignForm.studentID}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, studentID: e.target.value }))}
              placeholder="Student ID"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <select
              required
              value={assignForm.classID}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, classID: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.classID} value={item.classID}>
                  {item.className} ({item.classCode})
                </option>
              ))}
            </select>
            <select
              required
              value={assignForm.roomAssetID}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, roomAssetID: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">Select available asset</option>
              {availableAssets.map((item) => (
                <option key={item.roomAssetID} value={item.roomAssetID}>
                  {item.assetCode || item.assetName || `Asset ${item.assetID}`} • SN {item.serialNumber}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Assign Now
            </button>
          </form>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Report Asset Issue</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Submit quick issue reports for ongoing sessions.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleIssueReport}>
            <input
              type="number"
              min="1"
              required
              value={issueForm.sessionID}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, sessionID: e.target.value }))}
              placeholder="Practice Session ID"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <textarea
              required
              rows={4}
              value={issueForm.studentDescription}
              onChange={(e) =>
                setIssueForm((prev) => ({ ...prev, studentDescription: e.target.value }))
              }
              placeholder="Describe the issue and impact"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              Send Issue Report
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Live Assignments</h2>
          <div className="mt-4 space-y-3">
            {visibleAssignments.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">No active assignments.</p>
            )}
            {visibleAssignments.map((item) => (
              <div
                key={item.assignmentID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      Student #{item.studentID} • Class #{item.classID}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      RoomAsset #{item.roomAssetID} • Assigned {new Date(item.assignedDate).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnassign(item.assignmentID)}
                    className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    Unassign
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Recent Issue Feed</h2>
          <div className="mt-4 space-y-3">
            {visibleIssues.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">No issues reported yet.</p>
            )}
            {visibleIssues.map((issue) => (
              <div
                key={issue.errorLogID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy-700 dark:text-white">
                    Session #{issue.sessionID}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      issue.resolutionTime
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {issue.resolutionTime ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                  {issue.studentDescription || "No details provided."}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
