import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Card from "components/card";
import Modal from "components/modal/Modal";
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
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import {
  toDateKeyInTimeZone,
} from "services/dateTimeService";

export default function TeacherPortal() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [incidentCategories, setIncidentCategories] = useState([]);
  const [userTimeZoneId, setUserTimeZoneId] = useState("");
  const [assetActionBusyByRow, setAssetActionBusyByRow] = useState({});
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetModalStudent, setAssetModalStudent] = useState(null);
  const [assetModalAction, setAssetModalAction] = useState("assign");
  const [assetModalSelection, setAssetModalSelection] = useState("");

  const [issueForm, setIssueForm] = useState({
    sessionID: "",
    studentDescription: "",
    errorType: "",
  });

  const normalizeAssignment = useCallback((item = {}) => ({
    ...item,
    assignmentID: item.assignmentID ?? item.assignmentId ?? null,
    studentID: item.studentID ?? item.studentId ?? null,
    classID: item.classID ?? item.classId ?? null,
    roomAssetID: item.roomAssetID ?? item.roomAssetId ?? null,
    assetID: item.assetID ?? item.assetId ?? null,
    studentName: item.studentName ?? item.student?.fullName ?? item.student?.name ?? null,
    studentCode: item.studentCode ?? item.student?.studentCode ?? null,
    assetCode: item.assetCode ?? item.asset?.assetCode ?? null,
    assetName: item.assetName ?? item.asset?.assetName ?? null,
    serialNumber: item.serialNumber ?? item.roomAsset?.serialNumber ?? null,
    assetStatus: item.assetStatus ?? item.statusItemCode ?? null,
    isCheckedOut: item.isCheckedOut ?? item.ischeckedOut ?? false,
    checkedOutAt: item.checkedOutAt ?? null,
  }), []);

  const normalizeAvailableAsset = useCallback((item = {}) => ({
    ...item,
    roomAssetID: item.roomAssetID ?? item.roomAssetId ?? null,
    roomID: item.roomID ?? item.roomId ?? null,
    assetID: item.assetID ?? item.assetId ?? null,
    assetCode: item.assetCode ?? item.asset?.assetCode ?? null,
    assetName: item.assetName ?? item.asset?.assetName ?? null,
    serialNumber: item.serialNumber ?? item.roomAsset?.serialNumber ?? null,
    condition: item.condition ?? item.assetCondition ?? item.roomAsset?.condition ?? null,
  }), []);

  const normalizeClass = useCallback((item = {}) => ({
    ...item,
    classID: item.classID ?? item.classId ?? null,
    roomID: item.roomID ?? item.roomId ?? null,
    students: Array.isArray(item.students)
      ? item.students.map((student) => ({
          ...student,
          studentID: student.studentID ?? student.studentId ?? null,
          studentCode: student.studentCode ?? null,
          studentName: student.studentName ?? student.fullName ?? student.name ?? null,
        }))
      : [],
  }), []);

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

  const classById = useMemo(
    () =>
      classes.reduce((acc, item) => {
        acc[item.classID] = item;
        return acc;
      }, {}),
    [classes]
  );

  // Schedule items: one entry per scheduled lesson, drives the day-by-day calendar view
  const scheduleItems = useMemo(() => {
    const classAssignmentsByStudent = activeAssignments.reduce((acc, item) => {
      if (!item.classID || !item.studentID) {
        return acc;
      }

      const classKey = String(item.classID);
      if (!acc[classKey]) {
        acc[classKey] = {};
      }

      const existing = acc[classKey][item.studentID];
      const existingAssignedAt = new Date(existing?.assignedDate || 0).getTime();
      const currentAssignedAt = new Date(item.assignedDate || 0).getTime();
      if (!existing || currentAssignedAt >= existingAssignedAt) {
        acc[classKey][item.studentID] = item;
      }

      return acc;
    }, {});

    const sessionsByClassDate = sessions.reduce((acc, session) => {
      const key = toDateKeyInTimeZone(session.startTime, userTimeZoneId);
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

      const startTime = session.startTime || "";
      const endTime = session.endTime || "";
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
        studentName: session.studentName,
        roomAssetID: session.roomAssetID,
        assetID: session.assetID || null,
        assetCode: session.assetCode || null,
        attendanceStatus: session.attendanceStatus || "Pending",
      });

      return acc;
    }, {});

    return classes.map((item) => {
      const classKey = String(item.classID);
      const assignmentMap = classAssignmentsByStudent[classKey] || {};
      const classLessonMapByDate = sessionsByClassDate[classKey] || {};

      const rosterStudentIds = new Set(
        Object.keys(assignmentMap).map((studentId) => Number(studentId)).filter(Boolean)
      );
      
      // Include all enrolled students from the class roster
      if (Array.isArray(item.students)) {
        item.students.forEach((student) => {
          if (student.studentID) {
            rosterStudentIds.add(student.studentID);
          }
        });
      }
      
      Object.values(classLessonMapByDate).forEach((lessonGroupByTime) => {
        Object.values(lessonGroupByTime || {}).forEach((lessonGroup) => {
          lessonGroup.sessionRecords.forEach((sessionRecord) => {
            if (sessionRecord.studentID) {
              rosterStudentIds.add(sessionRecord.studentID);
            }
          });
        });
      });

      const defaultStudents = Array.from(rosterStudentIds)
        .map((studentID) => {
          const assignment = assignmentMap[studentID];
          const classStudent = Array.isArray(item.students) 
            ? item.students.find(s => s.studentID === studentID)
            : null;
          return {
            studentID,
            classID: item.classID,
            assignmentId: assignment?.assignmentID || null,
            studentCode: assignment?.studentCode || classStudent?.studentCode || null,
            name: assignment?.studentName || classStudent?.studentName || t(K.TEACHER_STUDENT_LABEL, "Student"),
            assetID: assignment?.assetID || null,
            roomAssetID: assignment?.roomAssetID || null,
            assetCode: assignment?.assetCode || null,
            serialNumber: assignment?.serialNumber || null,
            assetStatus: assignment?.assetStatus || null,
            isCheckedOut: assignment?.isCheckedOut || false,
            checkedOutAt: assignment?.checkedOutAt || null,
            assetLabel: assignment?.serialNumber
              ? `SN ${assignment.serialNumber}`
              : assignment?.assetCode || (assignment?.roomAssetID ? `Asset #${assignment.roomAssetID}` : null),
            attendanceStatus: "Not-recorded",
          };
        })
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

      const scheduleGroups = Array.isArray(item.scheduleGroups) && item.scheduleGroups.length > 0
        ? item.scheduleGroups
        : [{
            daysMask: item.scheduleDaysMask || 0,
            startTime: item.scheduleStartTime || "",
            endTime: item.scheduleEndTime || "",
          }];

      return {
        id: item.classID,
        roomID: item.roomID || null,
        classCode: item.classCode || null,
        name: item.className,
        courseName: item.courseName || item.course?.courseName || item.className,
        room: item.roomName || "",
        startDate: item.startDate,
        endDate: item.endDate,
        daysMask: item.scheduleDaysMask || 0,
        lessons: scheduleGroups.map((group) => ({
          classID: item.classID,
          startTime: group.startTime || "",
          endTime: group.endTime || "",
          summaryLabel: `0/${defaultStudents.length} attended`,
          students: defaultStudents.map((student) => ({
            ...student,
            attendanceStatus: "Not-recorded",
          })),
        })),
        lessonsByDate: Object.keys(classLessonMapByDate).reduce((dateAcc, dateKey) => {
          const lessonGroups = classLessonMapByDate[dateKey] || {};
          dateAcc[dateKey] = Object.values(lessonGroups).map((group) => {
            const statusByStudent = group.sessionRecords.reduce((statusAcc, sessionRecord) => {
              statusAcc[sessionRecord.studentID] = {
                studentName: sessionRecord.studentName,
                attendanceStatus: sessionRecord.attendanceStatus || "Pending",
                roomAssetID: sessionRecord.roomAssetID,
                assetID: sessionRecord.assetID || null,
                assetCode: sessionRecord.assetCode || null,
              };
              return statusAcc;
            }, {});

            const studentIds = new Set([...rosterStudentIds]);
            Object.keys(statusByStudent).forEach((studentId) => {
              if (Number(studentId)) {
                studentIds.add(Number(studentId));
              }
            });

            const students = Array.from(studentIds).map((studentID) => {
              const assignment = assignmentMap[studentID] || null;
              const sessionDetail = statusByStudent[studentID];
              const classStudent = Array.isArray(item.students) 
                ? item.students.find(s => s.studentID === studentID)
                : null;
              const resolvedRoomAssetID = sessionDetail?.roomAssetID || assignment?.roomAssetID || null;
              const resolvedAssetID = sessionDetail?.assetID || assignment?.assetID || null;
              const resolvedAssetCode = sessionDetail?.assetCode || assignment?.assetCode || null;

              return {
                studentID,
                classID: item.classID,
                assignmentId: assignment?.assignmentID || null,
                studentCode: assignment?.studentCode || classStudent?.studentCode || null,
                name: assignment?.studentName || sessionDetail?.studentName || classStudent?.studentName || t(K.TEACHER_STUDENT_LABEL, "Student"),
                roomAssetID: resolvedRoomAssetID,
                assetID: resolvedAssetID,
                assetCode: resolvedAssetCode || null,
                serialNumber: assignment?.serialNumber || null,
                assetStatus: assignment?.assetStatus || null,
                isCheckedOut: assignment?.isCheckedOut || false,
                checkedOutAt: assignment?.checkedOutAt || null,
                assetLabel: assignment?.serialNumber
                  ? `SN ${assignment.serialNumber}`
                  : resolvedAssetCode || (resolvedRoomAssetID ? `Asset #${resolvedRoomAssetID}` : null),
                attendanceStatus: sessionDetail?.attendanceStatus || "Not-recorded",
              };
            }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

            const attendedCount = students.filter((s) => s.attendanceStatus === "Valid").length;

            return {
              classID: item.classID,
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
  }, [classes, activeAssignments, sessions, userTimeZoneId, t]);

  const calendarEvents = useMemo(
    () =>
      filteredIssues.map((issue) => {
        const session = sessionById[issue.sessionID];
        return {
          date: issue.errorTime,
          type: "issue",
          label: session?.assetCode || `${t(K.TEACHER_SESSION_LABEL, "Session")} #${issue.sessionID}`,
          subtitle: issue.studentDescription || "Issue reported",
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
      setUserTimeZoneId(currentUser?.timeZoneId || "");

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

      setAvailableAssets((available || []).map((item) => normalizeAvailableAsset(item)));
      setActiveAssignments((active || []).map((item) => normalizeAssignment(item)));
      setRecentIssues(
        [...(issues || [])].sort(
          (a, b) => new Date(b.errorTime || 0) - new Date(a.errorTime || 0)
        )
      );
      setClasses((classList || []).map((item) => normalizeClass(item)));
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

  useEffect(() => {
    const PERMANENT_INCIDENT_CATEGORIES = [
      { itemCode: "HARDWARE_FAILURE", label: "Hardware Failure" },
      { itemCode: "SOFTWARE_ISSUE", label: "Software Issue" },
      { itemCode: "NETWORK_ISSUE", label: "Network / Connectivity" },
      { itemCode: "POWER_ISSUE", label: "Power Issue" },
      { itemCode: "OTHER", label: "Other" },
    ];

    configurationService.getItems("ErrorType", language).then((items) => {
      const configItems = (items || []).map((item) => ({
        itemCode: item.itemCode,
        label: item.label || item.itemCode,
      }));
      const merged = [...PERMANENT_INCIDENT_CATEGORIES];
      configItems.forEach((ci) => {
        if (!merged.find((m) => m.itemCode === ci.itemCode)) {
          merged.push(ci);
        }
      });
      setIncidentCategories(merged);
    }).catch(() => {
      setIncidentCategories(PERMANENT_INCIDENT_CATEGORIES);
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

  const getAvailableAssetsForStudent = useMemo(() => {
    return (student) => {
      if (!student?.classID || !student?.studentID) {
        return [];
      }

      const classInfo = classById[student.classID];
      const roomID = classInfo?.roomID || null;

      const inRoomAssets = availableAssets.filter((asset) => {
        if (!roomID || !asset.roomID) {
          return true;
        }
        return Number(asset.roomID) === Number(roomID);
      });

      const scopedAssets = inRoomAssets.length > 0 ? inRoomAssets : availableAssets;
      const filtered = [...scopedAssets];

      const currentAssignment = activeAssignments.find((assignment) =>
        Number(assignment.classID) === Number(student.classID)
        && Number(assignment.studentID) === Number(student.studentID)
      );
      const currentRoomAssetID = Number(student.roomAssetID || currentAssignment?.roomAssetID || 0);
      const hasCurrentAsset = currentRoomAssetID > 0 && filtered.some((asset) => Number(asset.roomAssetID) === currentRoomAssetID);
      if (!hasCurrentAsset && currentRoomAssetID > 0) {
        filtered.unshift({
          roomAssetID: currentRoomAssetID,
          assetID: student.assetID || currentAssignment?.assetID || null,
          assetCode: student.assetCode || currentAssignment?.assetCode || null,
          assetName: student.assetName || currentAssignment?.assetName || null,
          serialNumber: student.serialNumber || currentAssignment?.serialNumber || null,
          condition: currentAssignment?.condition || null,
        });
      }

      return filtered;
    };
  }, [availableAssets, classById, activeAssignments]);

  const runStudentAssetAction = async (student, action, selectedRoomAssetID = null) => {
    if (!student?.classID || !student?.studentID) {
      return false;
    }

    const rowKey = `${student.classID}-${student.studentID}`;
    const selectedAssetId = Number(selectedRoomAssetID || 0);
    const currentRoomAssetID = Number(student.roomAssetID || 0);

    setAssetActionBusyByRow((prev) => ({ ...prev, [rowKey]: true }));
    try {
      if (action === "remove") {
        if (!student.assignmentId) {
          showToast(t(K.TEACHER_ASSIGN_FAILED, "Assignment failed"), true);
          return false;
        }

        await studentEquipmentAssignmentService.unassign(student.assignmentId);
        showToast(t(K.TEACHER_ASSET_REMOVED_SUCCESS, "Asset removed from student."));
      } else if (action === "assign") {
        if (!selectedAssetId) {
          showToast(t(K.TEACHER_SELECT_AVAILABLE_ASSET, "Select available asset"), true);
          return false;
        }

        await studentEquipmentAssignmentService.create({
          studentID: Number(student.studentID),
          classID: Number(student.classID),
          roomAssetID: selectedAssetId,
          assignedDate: new Date().toISOString(),
          isActive: true,
        });
        showToast(t(K.TEACHER_ASSIGN_SUCCESS, "Asset assigned successfully."));
      } else if (action === "change") {
        if (!student.assignmentId) {
          showToast(t(K.TEACHER_ASSIGN_FAILED, "Assignment failed"), true);
          return false;
        }

        if (!selectedAssetId) {
          showToast(t(K.TEACHER_SELECT_AVAILABLE_ASSET, "Select available asset"), true);
          return false;
        }

        if (selectedAssetId === currentRoomAssetID) {
          showToast(t(K.TEACHER_ASSET_ALREADY_ASSIGNED, "Selected asset is already assigned to this student."));
          return false;
        }

        await studentEquipmentAssignmentService.create({
          studentID: Number(student.studentID),
          classID: Number(student.classID),
          roomAssetID: selectedAssetId,
          assignedDate: new Date().toISOString(),
          isActive: true,
        });
        await studentEquipmentAssignmentService.unassign(student.assignmentId);
        showToast(t(K.TEACHER_ASSET_CHANGED_SUCCESS, "Student asset changed successfully."));
      }

      await loadData();
      return true;
    } catch (error) {
      showToast(`${t(K.TEACHER_ASSIGN_FAILED, "Assignment failed")}: ${error.message}`, true);
      return false;
    } finally {
      setAssetActionBusyByRow((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const openAssetModal = useCallback((student, action) => {
    setAssetModalStudent(student);
    setAssetModalAction(action);
    setAssetModalSelection(action === "change" ? String(student?.roomAssetID || "") : "");
    setAssetModalOpen(true);
  }, []);

  const closeAssetModal = useCallback(() => {
    setAssetModalOpen(false);
    setAssetModalStudent(null);
    setAssetModalAction("assign");
    setAssetModalSelection("");
  }, []);

  const modalAssetOptions = useMemo(() => {
    if (!assetModalStudent) {
      return [];
    }
    return getAvailableAssetsForStudent(assetModalStudent);
  }, [assetModalStudent, getAvailableAssetsForStudent]);

  const confirmAssetModalAction = useCallback(async () => {
    if (!assetModalStudent) {
      return;
    }

    const succeeded = await runStudentAssetAction(assetModalStudent, assetModalAction, assetModalSelection);
    if (succeeded) {
      closeAssetModal();
    }
  }, [assetModalStudent, assetModalAction, assetModalSelection, closeAssetModal]);

  const buildStudentAssetModalData = useCallback(({ student }) => {
    if (!student?.studentID || !student?.classID || !student?.assignmentId) {
      return null;
    }

    const rowKey = `${student.classID}-${student.studentID}`;
    const isBusy = Boolean(assetActionBusyByRow[rowKey]);

    return {
      footerActions: ({ onClose }) => (
        <>
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            onClick={() => {
              onClose();
              openAssetModal(student, "change");
            }}
            disabled={isBusy}
          >
            {t(K.TEACHER_CHANGE_ASSET, "Change asset")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            onClick={async () => {
              const ok = await runStudentAssetAction(student, "remove");
              if (ok) {
                onClose();
              }
            }}
            disabled={isBusy}
          >
            {t(K.TEACHER_REMOVE_ASSET, "Remove asset")}
          </button>
        </>
      ),
    };
  }, [assetActionBusyByRow, openAssetModal, runStudentAssetAction, t]);

  const renderStudentActions = useMemo(() => {
    return ({ student }) => {
      if (!student?.studentID || !student?.classID) {
        return null;
      }

      const rowKey = `${student.classID}-${student.studentID}`;
      const isBusy = Boolean(assetActionBusyByRow[rowKey]);
      const hasAssignment = Boolean(student.assignmentId);

      if (hasAssignment) {
        return null;
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            onClick={() => openAssetModal(student, "assign")}
            disabled={isBusy}
          >
            {t(K.TEACHER_ASSIGN_NOW, "Assign asset")}
          </button>
        </div>
      );
    };
  }, [assetActionBusyByRow, openAssetModal, t]);

  const handleIssueReport = async (event) => {
    event.preventDefault();
    try {
      await practiceErrorLogService.create({
        sessionID: Number(issueForm.sessionID),
        errorTime: new Date().toISOString(),
        errorType: issueForm.errorType || undefined,
        studentDescription: issueForm.studentDescription,
        instructorNotified: true,
      });
      setIssueForm({ sessionID: "", studentDescription: "", errorType: "" });
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
            timeZoneId={userTimeZoneId}
            onForceReturn={handleForceReturn}
            renderStudentActions={renderStudentActions}
            buildStudentAssetModalData={buildStudentAssetModalData}
            title={t(K.TEACHER_TRAINING_CALENDAR, "Training Calendar")}
            detailsTitle={t("COMMON_DAILY_DETAILS", "Daily Details")}
            noEventsText={t(K.TEACHER_NO_EVENTS_ON_DATE, "No training events on selected date.")}
          />
        </Card>
      </div>

      <Modal
        isOpen={assetModalOpen}
        onClose={closeAssetModal}
        title={assetModalAction === "change"
          ? t(K.TEACHER_CHANGE_ASSET, "Change asset")
          : t(K.TEACHER_ASSIGN_NOW, "Assign asset")}
        maxWidth="max-w-3xl"
        footer={(
          <>
            <button
              type="button"
              onClick={closeAssetModal}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t(K.MODAL_CLOSE, "Close")}
            </button>
            <button
              type="button"
              onClick={confirmAssetModalAction}
              disabled={!assetModalSelection}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {assetModalAction === "change"
                ? t(K.TEACHER_CHANGE_ASSET, "Change asset")
                : t(K.TEACHER_ASSIGN_NOW, "Assign asset")}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-navy-900">
            <p className="font-semibold text-navy-700 dark:text-white">
              {assetModalStudent?.studentCode || assetModalStudent?.name || t(K.TEACHER_STUDENT_LABEL, "Student")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {t(K.TEACHER_SELECT_AVAILABLE_ASSET, "Select available asset in class room")}
            </p>
          </div>

          {modalAssetOptions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              {t(K.TEACHER_NO_AVAILABLE_ASSETS_IN_ROOM, "No available assets found in this room.")}
            </p>
          ) : (
            <div className="space-y-2">
              {modalAssetOptions.map((asset) => {
                const value = String(asset.roomAssetID);
                const isSelected = assetModalSelection === value;
                return (
                  <label
                    key={`asset-modal-${asset.roomAssetID}`}
                    className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 ${isSelected
                      ? "border-brand-500 bg-brand-50 dark:bg-navy-800"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-navy-900"}`}
                  >
                    <div className="pr-3">
                      <p className="text-sm font-semibold text-navy-700 dark:text-white">
                        {asset.assetCode || asset.assetName || t(K.TEACHER_ASSET_LABEL, "Asset")}
                        {asset.serialNumber ? ` • SN ${asset.serialNumber}` : ""}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {t(K.TEACHER_ASSET_CONDITION, "Condition")}: {asset.condition || asset.assetCondition || t(K.COMMON_UNKNOWN, "Unknown")}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="asset-modal-selection"
                      value={value}
                      checked={isSelected}
                      onChange={(event) => setAssetModalSelection(event.target.value)}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* message removed — now using react-hot-toast */}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
            <select
              value={issueForm.errorType}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, errorType: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-900"
            >
              <option value="">{t(K.INCIDENT_SELECT_CATEGORY, "Select incident category")}</option>
              {incidentCategories.map((cat) => (
                <option key={cat.itemCode} value={cat.itemCode}>{cat.label}</option>
              ))}
            </select>
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
