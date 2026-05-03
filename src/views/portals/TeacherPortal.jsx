import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Card from "components/card";
import TrainingCalendarBoard from "components/calendar/TrainingCalendarBoard";
import PortalLayout from "layouts/portal";
import {
  classService,
  studentEquipmentAssignmentService,
  practiceErrorLogService,
  practiceSessionService,
} from "services/api";
import assetService from "services/assetService";
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

export default function TeacherPortal() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  const sessionById = useMemo(
    () =>
      sessions.reduce((acc, session) => {
        acc[session.sessionID] = session;
        return acc;
      }, {}),
    [sessions]
  );

  const allowedAssignmentKeys = useMemo(
    () =>
      new Set(
        activeAssignments
          .filter((item) => item.classID && item.roomAssetID)
          .map((item) => `${item.classID}-${item.roomAssetID}`)
      ),
    [activeAssignments]
  );

  const filteredIssues = useMemo(
    () =>
      recentIssues.filter((issue) => {
        const session = sessionById[issue.sessionID];
        if (!session?.classID || !session?.roomAssetID) {
          return false;
        }
        return allowedAssignmentKeys.has(`${session.classID}-${session.roomAssetID}`);
      }),
    [recentIssues, sessionById, allowedAssignmentKeys]
  );

  // Schedule items: one entry per class, drives the day-by-day calendar view
  const scheduleItems = useMemo(() => {
    const classAssignments = activeAssignments.reduce((acc, item) => {
      if (!acc[item.classID]) {
        acc[item.classID] = [];
      }
      acc[item.classID].push(item);
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
        acc[classKey][key] = {};
      }

      const startTime = formatSessionTime(session.startTime);
      const endTime = formatSessionTime(session.endTime);
      const lessonKey = `${startTime}-${endTime}`;

      if (!acc[classKey][key][lessonKey]) {
        acc[classKey][key][lessonKey] = {
          startTime,
          endTime,
          sessionRecords: [],
        };
      }

      acc[classKey][key][lessonKey].sessionRecords.push({
        studentID: session.studentID,
        roomAssetID: session.roomAssetID,
        attendanceStatus: session.attendanceStatus || "Pending",
      });

      return acc;
    }, {});

    return classes.map((item) => {
      const assignments = classAssignments[item.classID] || [];
      const defaultStudents = assignments.map((assignment) => ({
        studentID: assignment.studentID,
        name: assignment.student?.user
          ? `${assignment.student.user.firstName || ""} ${assignment.student.user.lastName || ""}`.trim() || `Student #${assignment.studentID}`
          : `Student #${assignment.studentID}`,
        assetLabel: assignment.roomAssetID ? `Asset #${assignment.roomAssetID}` : null,
        attendanceStatus: "Not-recorded",
      }));

      const classLessonMapByDate = sessionsByClassDate[String(item.classID)] || {};

      return {
        id: item.classID,
        name: item.className,
        courseName: item.courseName || item.course?.courseName || item.className,
        room: item.roomName || "",
        startDate: item.startDate,
        endDate: item.endDate,
        daysMask: item.scheduleDaysMask || 0,
        lessons: [
          {
            startTime: item.scheduleStartTime || "",
            endTime: item.scheduleEndTime || "",
            summaryLabel: `${defaultStudents.filter((s) => s.attendanceStatus === "Valid").length}/${defaultStudents.length} attended`,
            students: defaultStudents,
          },
        ],
        lessonsByDate: Object.keys(classLessonMapByDate).reduce((dateAcc, dateKey) => {
          const lessonGroups = classLessonMapByDate[dateKey] || {};
          dateAcc[dateKey] = Object.values(lessonGroups).map((group) => {
            const statusByStudent = group.sessionRecords.reduce((statusAcc, sessionRecord) => {
              statusAcc[sessionRecord.studentID] = {
                attendanceStatus: sessionRecord.attendanceStatus || "Pending",
                roomAssetID: sessionRecord.roomAssetID,
              };
              return statusAcc;
            }, {});

            const students = assignments.map((assignment) => {
              const sessionDetail = statusByStudent[assignment.studentID];
              return {
                studentID: assignment.studentID,
                assignmentId: assignment.assignmentID,
                name: assignment.student?.user
                  ? `${assignment.student.user.firstName || ""} ${assignment.student.user.lastName || ""}`.trim() || `Student #${assignment.studentID}`
                  : `Student #${assignment.studentID}`,
                assetLabel: sessionDetail?.roomAssetID
                  ? `Asset #${sessionDetail.roomAssetID}`
                  : assignment.roomAssetID
                  ? `Asset #${assignment.roomAssetID}`
                  : null,
                attendanceStatus: sessionDetail?.attendanceStatus || "Not-recorded",
              };
            });

            const attendedCount = students.filter((s) => s.attendanceStatus === "Valid").length;

            return {
              startTime: group.startTime,
              endTime: group.endTime,
              summaryLabel: `${attendedCount}/${students.length} attended`,
              students,
            };
          });
          return dateAcc;
        }, {}),
      };
    });
  }, [classes, activeAssignments, sessions]);

  const calendarEvents = useMemo(
    () =>
      filteredIssues.map((issue) => {
        const session = sessionById[issue.sessionID];
        return {
          date: issue.errorTime,
          type: "issue",
          label: `${t(K.TEACHER_SESSION_LABEL, "Session")} #${issue.sessionID}`,
          subtitle: session?.roomAssetID
            ? `Asset #${session.roomAssetID} • ${issue.studentDescription || "Issue reported"}`
            : issue.studentDescription || "Issue reported",
        };
      }),
    [filteredIssues, sessionById, t]
  );

  const showToast = (text, error = false) => {
    if (error) toast.error(text);
    else toast.success(text);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const instructorId = currentUser?.instructorRole?.instructorID;

      const [availableRes, activeRes, issuesRes, classListRes, sessionListRes] =
        await Promise.allSettled([
        assetService.getAvailableForTraining(),
        studentEquipmentAssignmentService.getActive(),
        practiceErrorLogService.getAll(),
        instructorId ? classService.getByInstructor(instructorId) : classService.getActive(),
        practiceSessionService.getAll(),
      ]);

      const available = availableRes.status === "fulfilled" ? availableRes.value : [];
      const active = activeRes.status === "fulfilled" ? activeRes.value : [];
      const issues = issuesRes.status === "fulfilled" ? issuesRes.value : [];
      const sessionList = sessionListRes.status === "fulfilled" ? sessionListRes.value : [];
      let classList = classListRes.status === "fulfilled" ? classListRes.value || [] : [];

      if (classList.length === 0 && active.length > 0) {
        const classIds = [...new Set(active.map((item) => item.classID).filter(Boolean))];
        if (classIds.length > 0) {
          const classDetailResults = await Promise.allSettled(
            classIds.map((classId) => classService.getById(classId))
          );
          classList = classDetailResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);
        }
      }

      setAvailableAssets(available || []);
      setActiveAssignments(active || []);
      setRecentIssues(
        [...(issues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setClasses(classList || []);
      setSessions(sessionList || []);

      if (classListRes.status === "rejected") {
        showToast(
          `${t(K.TEACHER_LOAD_FAILED, "Failed to load teacher workspace")}: ${classListRes.reason?.message || "Failed to load classes"}`,
          true
        );
      }
    } catch (error) {
      showToast(`${t(K.TEACHER_LOAD_FAILED, "Failed to load teacher workspace")}: ${error.message}`, true);
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
      showToast(t(K.TEACHER_ASSIGN_SUCCESS, "Asset assigned successfully."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.TEACHER_ASSIGN_FAILED, "Assignment failed")}: ${error.message}`, true);
    }
  };

  const handleForceReturn = async (assignmentId) => {
    const reason = window.prompt(
      t(K.TEACHER_FORCE_RETURN_REASON, "Enter force return reason:"),
      t(K.TEACHER_FORCE_RETURN_DEFAULT_REASON, "Returned by teacher/admin")
    );
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await studentEquipmentAssignmentService.forceReturn(assignmentId, reason.trim());
      showToast(t(K.TEACHER_FORCE_RETURN_SUCCESS, "Asset force-returned."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.TEACHER_FORCE_RETURN_FAILED, "Force return failed")}: ${error.message}`, true);
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
      showToast(t(K.TEACHER_ISSUE_REPORTED, "Issue reported successfully."));
      await loadData();
    } catch (error) {
      showToast(`${t(K.TEACHER_ISSUE_REPORT_FAILED, "Issue report failed")}: ${error.message}`, true);
    }
  };

  return (
    <PortalLayout title="Teacher Portal" titleKey={K.TEACHER_PORTAL_TITLE}>
      <div className="grid grid-cols-1 gap-5">
        <Card extra="p-6">
          <TrainingCalendarBoard
            value={calendarDate}
            onChange={setCalendarDate}
            scheduleItems={scheduleItems}
            events={calendarEvents}
            onForceReturn={handleForceReturn}
            title={t(K.TEACHER_TRAINING_CALENDAR, "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t(K.TEACHER_NO_EVENTS_ON_DATE, "No training events on selected date.")}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mt-5">
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.TEACHER_AVAILABLE_ASSETS, "Available Assets")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{availableAssets.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.TEACHER_READY_FOR_USE, "Good condition and ready for use")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.TEACHER_ACTIVE_ASSIGNMENTS, "Active Assignments")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">{activeAssignments.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.TEACHER_IN_STUDENT_HANDS, "Currently in student hands")}</p>
        </Card>
        <Card extra="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.TEACHER_OPEN_REPORTS, "Open Reports")}</p>
          <p className="mt-2 text-3xl font-bold text-navy-700 dark:text-white">
            {filteredIssues.filter((issue) => !issue.resolutionTime).length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t(K.TEACHER_REPORTED_ISSUES, "Teacher/student reported issues")}</p>
        </Card>
      </div>

      {/* message removed — now using react-hot-toast */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.TEACHER_ASSIGN_TITLE, "Assign Asset to Student")}</h2>
          <form className="mt-4 space-y-3" onSubmit={handleAssignAsset}>
            <input
              type="number"
              min="1"
              required
              value={assignForm.studentID}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, studentID: e.target.value }))}
              placeholder={t(K.TEACHER_STUDENT_ID, "Student ID")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <select
              required
              value={assignForm.classID}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, classID: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.TEACHER_SELECT_CLASS, "Select class")}</option>
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
              <option value="">{t(K.TEACHER_SELECT_AVAILABLE_ASSET, "Select available asset")}</option>
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
              {t(K.TEACHER_ASSIGN_NOW, "Assign Now")}
            </button>
          </form>
        </Card>

        <Card extra="p-6">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">{t(K.TEACHER_REPORT_ISSUE_TITLE, "Report Asset Issue")}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            {t(K.TEACHER_REPORT_ISSUE_HINT, "Submit quick issue reports for ongoing sessions.")}
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleIssueReport}>
            <input
              type="number"
              min="1"
              required
              value={issueForm.sessionID}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, sessionID: e.target.value }))}
              placeholder={t(K.TEACHER_SESSION_ID, "Practice Session ID")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <textarea
              required
              rows={4}
              value={issueForm.studentDescription}
              onChange={(e) =>
                setIssueForm((prev) => ({ ...prev, studentDescription: e.target.value }))
              }
              placeholder={t(K.TEACHER_DESCRIBE_ISSUE_IMPACT, "Describe the issue and impact")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {t(K.TEACHER_SEND_ISSUE_REPORT, "Send Issue Report")}
            </button>
          </form>
        </Card>
      </div>

      
    </PortalLayout>
  );
}
