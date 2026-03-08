import React, { useEffect, useMemo, useState } from "react";
import Card from "components/card";
import PortalLayout from "layouts/portal";
import {
  studentEquipmentAssignmentService,
  practiceSessionService,
  practiceErrorLogService,
} from "services/api";
import { getCurrentUser } from "services/userService";

export default function StudentPortal() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [issueForm, setIssueForm] = useState({ sessionID: "", studentDescription: "" });

  const openSessions = useMemo(
    () => sessions.filter((session) => !session.endTime).slice(0, 6),
    [sessions]
  );

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.isActive),
    [assignments]
  );

  const showToast = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const myAssignments = await studentEquipmentAssignmentService.getMine();
      setAssignments(myAssignments || []);

      const me = await getCurrentUser();
      const studentId = me?.studentRole?.studentID;

      if (studentId) {
        const mySessions = await practiceSessionService.getByStudent(studentId);
        setSessions(mySessions || []);
      } else {
        setSessions([]);
      }
    } catch (error) {
      showToast(`Failed to load student portal: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async (event) => {
    event.preventDefault();
    if (!selectedAssignmentId) {
      showToast("Select an assignment to check in.", true);
      return;
    }

    try {
      await practiceSessionService.studentCheckIn({ assignmentID: Number(selectedAssignmentId) });
      showToast("Check-in successful.");
      setSelectedAssignmentId("");
      await loadData();
    } catch (error) {
      showToast(`Check-in failed: ${error.message}`, true);
    }
  };

  const handleCheckOut = async (sessionId) => {
    try {
      await practiceSessionService.studentCheckOut({ sessionID: Number(sessionId) });
      showToast("Check-out successful.");
      await loadData();
    } catch (error) {
      showToast(`Check-out failed: ${error.message}`, true);
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
      showToast("Issue reported successfully.");
      await loadData();
    } catch (error) {
      showToast(`Issue report failed: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Student Portal">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">My Active Assets</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Ready for class attendance check</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Open Sessions</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{openSessions.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Check out to complete attendance</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">Total Sessions</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{sessions.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">Practice activity history</p>
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
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Attendance Check-In</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Pick your assigned asset and start a session.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleCheckIn}>
            <select
              required
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">Select assignment</option>
              {activeAssignments.map((item) => (
                <option key={item.assignmentID} value={item.assignmentID}>
                  Assignment #{item.assignmentID} • Asset #{item.roomAssetID} • Class #{item.classID}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || activeAssignments.length === 0}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Check In
            </button>
          </form>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Report an Issue</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Share any equipment issue during your current session.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleReportIssue}>
            <select
              required
              value={issueForm.sessionID}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, sessionID: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">Select session</option>
              {openSessions.map((session) => (
                <option key={session.sessionID} value={session.sessionID}>
                  Session #{session.sessionID} • Asset #{session.roomAssetID}
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
              placeholder="Describe what happened"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <button
              type="submit"
              disabled={loading || openSessions.length === 0}
              className="w-full rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              Submit Issue
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">My Assigned Assets</h2>
          <div className="mt-4 space-y-3">
            {assignments.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">No assignments yet.</p>
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
                    {item.isActive ? "Active" : "Unassigned"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                  Class #{item.classID} • Assigned {new Date(item.assignedDate).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">Open Sessions</h2>
          <div className="mt-4 space-y-3">
            {openSessions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-300">No active check-ins.</p>
            )}
            {openSessions.map((session) => (
              <div
                key={session.sessionID}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">
                      Session #{session.sessionID}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      Asset #{session.roomAssetID} • Start {new Date(session.startTime).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckOut(session.sessionID)}
                    className="rounded-lg border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Check Out
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
