import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { classService, courseService, roomService, studentEquipmentAssignmentService } from "services/api";
import { getAllUsers } from "services/userService";
import { configurationService } from "services/configurationService";
import Card from "components/card";
import Table from "components/table/Table";
import TableFilterModal from "components/table/TableFilterModal";
import { renderEntityPill, renderLookupEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete, MdInventory2 } from "react-icons/md";
import Modal from "components/modal/Modal";
import RoomAssetIssueReporter from "components/roomAsset/RoomAssetIssueReporter";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";
import { utcClockTimeToTimeZone } from "services/dateTimeService";

export default function ClassesTable() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const createEmptyScheduleGroup = () => ({ daysMask: 0, startTime: "", endTime: "" });
  const createDefaultFormData = () => ({
    className: "",
    classCode: "",
    description: "",
    courseID: "",
    instructorID: "",
    startDate: "",
    endDate: "",
    maxStudents: "",
    cancelEnrollmentBeforeStartDays: "0",
    roomID: "",
    scheduleGroups: [createEmptyScheduleGroup()],
    isActive: true,
  });

  const [classes, setClasses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classAssets, setClassAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetAssignments, setAssetAssignments] = useState([]);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [operationalStatusOptions, setOperationalStatusOptions] = useState([]);
  const [editingAssetCondition, setEditingAssetCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [editingOperationalStatus, setEditingOperationalStatus] = useState(false);
  const [newOperationalStatus, setNewOperationalStatus] = useState("");
  const [editingAssetRoom, setEditingAssetRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isChangingAssetRoom, setIsChangingAssetRoom] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [newStudentId, setNewStudentId] = useState("");
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isUnassigningStudent, setIsUnassigningStudent] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("className");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState(createDefaultFormData());

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
    fetchRooms();
  }, []);

  useEffect(() => {
    const loadConditions = async () => {
      try {
        const [conditions, operationalStatuses] = await Promise.all([
          configurationService.getItems("AssetCondition", language),
          configurationService.getItems("EquipmentStatus", language),
        ]);
        setConditionOptions(conditions || []);
        setOperationalStatusOptions(operationalStatuses || []);
      } catch (error) {
        console.error("Failed to load status options:", error);
      }
    };
    loadConditions();
  }, [language]);

  const conditionLabelByCode = useMemo(() => {
    const map = new Map();
    (conditionOptions || []).forEach((item) => {
      map.set(String(item.itemCode || ""), item.label || item.itemCode || "");
    });
    return map;
  }, [conditionOptions]);

  const operationalStatusLabelByCode = useMemo(() => {
    const map = new Map();
    (operationalStatusOptions || []).forEach((item) => {
      map.set(String(item.itemCode || ""), item.label || item.itemCode || "");
    });
    return map;
  }, [operationalStatusOptions]);

  const getConditionLabel = (code) => {
    if (!code) {
      return t(K.ADMIN_TABLE_NA, "N/A");
    }
    return conditionLabelByCode.get(String(code)) || code;
  };

  const getOperationalStatusLabel = (code) => {
    if (!code) {
      return t(K.ADMIN_TABLE_NA, "N/A");
    }
    return operationalStatusLabelByCode.get(String(code)) || code;
  };

  const roomLabelById = useMemo(() => {
    const map = new Map();
    (rooms || []).forEach((room) => {
      map.set(Number(room.roomID), room.roomName || String(room.roomID));
    });
    return map;
  }, [rooms]);

  const getRoomName = (roomId) => {
    if (!roomId) {
      return t(K.ADMIN_TABLE_NA, "N/A");
    }
    return roomLabelById.get(Number(roomId)) || String(roomId);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchClasses();
  }, [page, pageSize, debouncedSearch, activeFilters, sortBy, sortDirection]);

  const scheduleDays = [
    { bit: 1 << 1, label: t(K.ADMIN_TABLE_MON, "Mon") },
    { bit: 1 << 2, label: t(K.ADMIN_TABLE_TUE, "Tue") },
    { bit: 1 << 3, label: t(K.ADMIN_TABLE_WED, "Wed") },
    { bit: 1 << 4, label: t(K.ADMIN_TABLE_THU, "Thu") },
    { bit: 1 << 5, label: t(K.ADMIN_TABLE_FRI, "Fri") },
    { bit: 1 << 6, label: t(K.ADMIN_TABLE_SAT, "Sat") },
    { bit: 1 << 0, label: t(K.ADMIN_TABLE_SUN, "Sun") },
  ];

  const parseDateInput = (value) => {
    if (!value) {
      return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  };

  const toMinutes = (timeValue) => {
    if (!timeValue) {
      return null;
    }

    const raw = String(timeValue).trim();
    const amPmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (amPmMatch) {
      let hour = Number(amPmMatch[1]);
      const minute = Number(amPmMatch[2]);
      const meridiem = amPmMatch[3].toUpperCase();

      if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        return null;
      }

      if (hour === 12) {
        hour = 0;
      }
      if (meridiem === "PM") {
        hour += 12;
      }

      return hour * 60 + minute;
    }

    const [hourPart, minutePart] = raw.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return hour * 60 + minute;
  };

  const hasOverlappingScheduleGroups = (groups) => {
    const normalizedGroups = (groups || [])
      .map((group) => {
        const startMinutes = toMinutes(group.startTime);
        const endMinutes = toMinutes(group.endTime);
        return {
          daysMask: Number(group.daysMask) || 0,
          startMinutes,
          endMinutes,
        };
      })
      .filter((group) => group.daysMask > 0 && group.startMinutes !== null && group.endMinutes !== null && group.startMinutes < group.endMinutes);

    for (let i = 0; i < normalizedGroups.length; i += 1) {
      for (let j = i + 1; j < normalizedGroups.length; j += 1) {
        const first = normalizedGroups[i];
        const second = normalizedGroups[j];
        const hasSharedDay = (first.daysMask & second.daysMask) !== 0;
        const hasTimeOverlap = first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;
        if (hasSharedDay && hasTimeOverlap) {
          return true;
        }
      }
    }

    return false;
  };

  const computeScheduledHours = (startDateValue, endDateValue, groups) => {
    const start = parseDateInput(startDateValue);
    const end = parseDateInput(endDateValue);
    if (!start || !end || end < start) {
      return 0;
    }

    const validGroups = (groups || [])
      .map((group) => {
        const startMinutes = toMinutes(group.startTime);
        const endMinutes = toMinutes(group.endTime);
        return {
          ...group,
          daysMask: Number(group.daysMask) || 0,
          startMinutes,
          endMinutes,
        };
      })
      .filter((group) => group.daysMask > 0 && group.startMinutes !== null && group.endMinutes !== null && group.startMinutes < group.endMinutes);

    if (validGroups.length === 0) {
      return 0;
    }

    let total = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
      const dayBit = 1 << cursor.getDay();
      const matchingGroups = validGroups.filter((item) => (item.daysMask & dayBit) !== 0);

      matchingGroups.forEach((group) => {
        total += (group.endMinutes - group.startMinutes) / 60;
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return total;
  };

  const selectedCourseHours = useMemo(() => {
    const selectedCourseId = Number(formData.courseID);
    if (!selectedCourseId) {
      return 0;
    }

    return Number(courses.find((item) => item.courseID === selectedCourseId)?.durationHours || 0);
  }, [courses, formData.courseID]);

  const totalScheduledHours = useMemo(() => {
    return computeScheduledHours(formData.startDate, formData.endDate, formData.scheduleGroups);
  }, [formData.startDate, formData.endDate, formData.scheduleGroups]);

  const hasScheduleOverlap = useMemo(() => {
    return hasOverlappingScheduleGroups(formData.scheduleGroups);
  }, [formData.scheduleGroups]);

  const isScheduleHoursInsufficient = selectedCourseHours > 0 && totalScheduledHours < selectedCourseHours;

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        courseID: activeFilters.courseID?.length ? Number(activeFilters.courseID[0]) : undefined,
        isActive: activeFilters.isActive?.length ? activeFilters.isActive[0] === "true" : undefined,
      });
      setClasses(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data || []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const users = await getAllUsers();
      const instructorUsers = (users || [])
        .filter((user) => user.instructorRole?.isActive)
        .map((user) => ({
          id: user.instructorRole.instructorID,
          userID: user.userID,
          name: user.fullName,
          email: user.email,
        }));

      setInstructors(instructorUsers);
    } catch (error) {
      console.error("Failed to fetch instructors:", error);
      setInstructors([]);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomService.getAll();
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
    }
  };


  const fetchClassAssets = async (classId) => {
    try {
      const classItem = classes.find((c) => c.classID === classId);
      if (!classItem || !classItem.roomID) {
        setClassAssets([]);
        return;
      }

      const data = await roomService.getAssets(classItem.roomID);
      setClassAssets(data || []);
      setSelectedAsset(null);
      setAssetAssignments([]);
    } catch (error) {
      console.error("Failed to fetch class assets:", error);
      setClassAssets([]);
    }
  };

  const fetchAssetAssignments = async (roomAssetId) => {
    try {
      const assignments = await studentEquipmentAssignmentService.getByAsset(roomAssetId);
      setAssetAssignments(assignments || []);
    } catch (error) {
      console.error("Failed to fetch asset assignments:", error);
      setAssetAssignments([]);
    }
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setNewCondition(asset.condition || "");
    setEditingAssetCondition(false);
    setNewOperationalStatus(asset.operationalStatus || "");
    setEditingOperationalStatus(false);
    setNewRoomId(asset.roomID ? String(asset.roomID) : "");
    setEditingAssetRoom(false);
    fetchAssetAssignments(asset.roomAssetID);
  };

  const handleUpdateAssetRoom = async (roomAssetId) => {
    if (!selectedAsset?.roomID || !newRoomId) {
      return;
    }

    const targetRoomId = Number(newRoomId);
    if (!Number.isFinite(targetRoomId) || targetRoomId <= 0) {
      return;
    }

    if (targetRoomId === Number(selectedAsset.roomID)) {
      setEditingAssetRoom(false);
      return;
    }

    setIsChangingAssetRoom(true);
    try {
      await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition: newCondition || selectedAsset.condition || null,
        operationalStatus: newOperationalStatus || selectedAsset.operationalStatus || null,
        remarks: selectedAsset.remarks || null,
        targetRoomID: targetRoomId,
      });

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Room updated successfully"));
      setEditingAssetRoom(false);
      setSelectedAsset(null);
      setAssetAssignments([]);
      if (selectedClassId) {
        await fetchClassAssets(selectedClassId);
      }
    } catch (error) {
      console.error("Failed to update asset room:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsChangingAssetRoom(false);
    }
  };

  const handleUpdateAssetCondition = async (roomAssetId, condition) => {
    try {
      if (!selectedAsset?.roomID) {
        toast.error(t(K.ADMIN_TABLE_ROOM, "Room") + " " + t(K.ADMIN_TABLE_NA, "N/A"));
        return;
      }

      const updated = await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition,
        operationalStatus: newOperationalStatus || selectedAsset.operationalStatus || null,
        remarks: selectedAsset.remarks || null,
      });
      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Condition updated successfully"));
      setEditingAssetCondition(false);
      setSelectedAsset(updated || selectedAsset);
      setClassAssets((prev) => prev.map((asset) => (asset.roomAssetID === roomAssetId ? {
        ...asset,
        ...(updated || {}),
        condition,
        operationalStatus: (updated && updated.operationalStatus) ? updated.operationalStatus : (newOperationalStatus || asset.operationalStatus),
      } : asset)));
    } catch (error) {
      console.error("Failed to update asset condition:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const handleUpdateOperationalStatus = async (roomAssetId, operationalStatus) => {
    try {
      if (!selectedAsset?.roomID) {
        toast.error(t(K.ADMIN_TABLE_ROOM, "Room") + " " + t(K.ADMIN_TABLE_NA, "N/A"));
        return;
      }

      const updated = await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition: newCondition || selectedAsset.condition || null,
        operationalStatus,
        remarks: selectedAsset.remarks || null,
      });

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Operational status updated successfully"));
      setEditingOperationalStatus(false);
      setSelectedAsset(updated || selectedAsset);
      setClassAssets((prev) => prev.map((asset) => (asset.roomAssetID === roomAssetId ? {
        ...asset,
        ...(updated || {}),
        operationalStatus,
      } : asset)));
    } catch (error) {
      console.error("Failed to update operational status:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const openAssignmentModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setNewStudentId(String(assignment?.studentID || ""));
    setShowAssignmentModal(true);

    try {
      const classDetail = await classService.getById(assignment.classID);
      const students = (classDetail?.students || [])
        .filter((student) => student?.isActive !== false)
        .sort((a, b) => String(a?.studentCode || "").localeCompare(String(b?.studentCode || "")));
      setClassStudents(students);
    } catch (error) {
      console.error("Failed to load class students:", error);
      setClassStudents([]);
    }
  };

  const handleChangeAssignedStudent = async () => {
    if (!selectedAssignment || !selectedAsset || !newStudentId) {
      return;
    }

    const targetStudentId = Number(newStudentId);
    if (targetStudentId === Number(selectedAssignment.studentID)) {
      setShowAssignmentModal(false);
      return;
    }

    setIsChangingStudent(true);
    try {
      await studentEquipmentAssignmentService.create({
        studentID: targetStudentId,
        classID: Number(selectedAssignment.classID),
        roomAssetID: Number(selectedAsset.roomAssetID),
        assignedDate: new Date().toISOString(),
        isActive: true,
      });
      await studentEquipmentAssignmentService.unassign(selectedAssignment.assignmentID);

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully"));
      await fetchAssetAssignments(selectedAsset.roomAssetID);
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
      setClassStudents([]);
    } catch (error) {
      console.error("Failed to change assigned student:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsChangingStudent(false);
    }
  };

  const handleUnassignStudent = async () => {
    if (!selectedAssignment || !selectedAsset) {
      return;
    }

    setIsUnassigningStudent(true);
    try {
      await studentEquipmentAssignmentService.unassign(selectedAssignment.assignmentID);
      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Unassigned successfully"));
      await fetchAssetAssignments(selectedAsset.roomAssetID);
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
      setClassStudents([]);
    } catch (error) {
      console.error("Failed to unassign student:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsUnassigningStudent(false);
    }
  };

  const openAssetModal = (classId) => {
    setSelectedClassId(classId);
    setShowAssetModal(true);
    fetchClassAssets(classId);
  };
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.instructorID) {
      toast.error(t(K.ADMIN_TABLE_INSTRUCTOR_REQUIRED, "Instructor is required."));
      return;
    }

    const validGroups = (formData.scheduleGroups || []).filter((group) => Number(group.daysMask) > 0);
    if (validGroups.length === 0) {
      toast.error(t(K.ADMIN_TABLE_SELECT_AT_LEAST_ONE_DAY, "Select at least one class day."));
      return;
    }

    const hasInvalidTimeGroup = validGroups.some((group) => {
      const startMinutes = toMinutes(group.startTime);
      const endMinutes = toMinutes(group.endTime);
      return startMinutes === null || endMinutes === null || startMinutes >= endMinutes;
    });
    if (hasInvalidTimeGroup) {
      toast.error(t(K.ADMIN_TABLE_INVALID_TIMEFRAME, "Each schedule group must have a valid start and end time."));
      return;
    }

    if (hasOverlappingScheduleGroups(validGroups)) {
      toast.error(t(K.ADMIN_TABLE_SCHEDULE_GROUPS_OVERLAP, "Schedule groups cannot overlap on the same day."));
      return;
    }

    const scheduleHours = computeScheduledHours(formData.startDate, formData.endDate, validGroups);
    if (selectedCourseHours > 0 && scheduleHours < selectedCourseHours) {
      toast.error(
        `${t(K.ADMIN_TABLE_SCHEDULE_HOURS_INSUFFICIENT, "Total scheduled hours must be at least course hours.")} ` +
        `${scheduleHours.toFixed(2)} / ${selectedCourseHours}`,
      );
      return;
    }

    const unionDaysMask = validGroups.reduce((mask, group) => mask | Number(group.daysMask || 0), 0);
    const scheduleStartTime = validGroups.map((group) => group.startTime).sort()[0];
    const scheduleEndTime = [...validGroups].map((group) => group.endTime).sort().reverse()[0];

    try {
      const dataToSend = {
        ...formData,
        courseID: parseInt(formData.courseID),
        instructorID: parseInt(formData.instructorID),
        roomID: formData.roomID ? parseInt(formData.roomID) : null,
        maxStudents: parseInt(formData.maxStudents) || 2147483647,
        cancelEnrollmentBeforeStartDays: Math.max(0, parseInt(formData.cancelEnrollmentBeforeStartDays, 10) || 0),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        scheduleGroups: validGroups.map((group) => ({
          daysMask: Number(group.daysMask),
          startTime: `${group.startTime}:00`,
          endTime: `${group.endTime}:00`,
        })),
        scheduleDaysMask: unionDaysMask,
        scheduleStartTime: scheduleStartTime ? `${scheduleStartTime}:00` : null,
        scheduleEndTime: scheduleEndTime ? `${scheduleEndTime}:00` : null,
      };

      if (editingId) {
        await classService.update(editingId, dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await classService.create(dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(createDefaultFormData());
      fetchClasses();
    } catch (error) {
      console.error("Failed to save class:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_CLASS, "class")}: ${error.message}${details}`);
    }
  };

  const normalizeTime = (value) => {
    if (!value) {
      return "";
    }

    return String(value).slice(0, 5);
  };

  // Convert a UTC HH:MM[:SS] time string to the local HH:MM in a given IANA timezone.
  const utcTimeToLocal = (utcTimeStr, tzId, referenceDate) => {
    if (!utcTimeStr || !tzId) return normalizeTime(utcTimeStr);
    try {
      return utcClockTimeToTimeZone(utcTimeStr, tzId, referenceDate);
    } catch {
      return normalizeTime(utcTimeStr);
    }
  };

  const toggleScheduleDay = (groupIndex, bit) => {
    setFormData((prev) => {
      const currentGroup = prev.scheduleGroups[groupIndex] || createEmptyScheduleGroup();
      const currentMask = Number(currentGroup.daysMask) || 0;
      const nextMask = currentMask & bit ? currentMask & ~bit : currentMask | bit;
      const nextGroups = [...prev.scheduleGroups];
      nextGroups[groupIndex] = {
        ...currentGroup,
        daysMask: nextMask,
      };

      return {
        ...prev,
        scheduleGroups: nextGroups,
      };
    });
  };

  const handleScheduleGroupTimeChange = (groupIndex, field, value) => {
    setFormData((prev) => {
      const nextGroups = [...prev.scheduleGroups];
      const currentGroup = nextGroups[groupIndex] || createEmptyScheduleGroup();
      nextGroups[groupIndex] = {
        ...currentGroup,
        [field]: value,
      };

      return {
        ...prev,
        scheduleGroups: nextGroups,
      };
    });
  };

  const addScheduleGroup = () => {
    setFormData((prev) => ({
      ...prev,
      scheduleGroups: [...(prev.scheduleGroups || []), createEmptyScheduleGroup()],
    }));
  };

  const removeScheduleGroup = (groupIndex) => {
    setFormData((prev) => {
      const nextGroups = (prev.scheduleGroups || []).filter((_, index) => index !== groupIndex);
      return {
        ...prev,
        scheduleGroups: nextGroups.length > 0 ? nextGroups : [createEmptyScheduleGroup()],
      };
    });
  };

  const handleEdit = (classItem) => {
    const tzId = currentUser?.timeZoneId;
    const normalizedGroups = (classItem.scheduleGroups && classItem.scheduleGroups.length > 0)
      ? classItem.scheduleGroups.map((group) => ({
          daysMask: Number(group.daysMask) || 0,
          startTime: utcTimeToLocal(group.startTime, tzId, classItem.startDate),
          endTime: utcTimeToLocal(group.endTime, tzId, classItem.startDate),
        }))
      : [{
          daysMask: classItem.scheduleDaysMask || 0,
          startTime: utcTimeToLocal(classItem.scheduleStartTime, tzId, classItem.startDate),
          endTime: utcTimeToLocal(classItem.scheduleEndTime, tzId, classItem.startDate),
        }];

    setFormData({
      className: classItem.className,
      classCode: classItem.classCode,
      description: classItem.description || "",
      courseID: classItem.courseID,
      instructorID: classItem.instructorID || "",
      roomID: classItem.roomID || "",
      startDate: classItem.startDate ? classItem.startDate.split("T")[0] : "",
      endDate: classItem.endDate ? classItem.endDate.split("T")[0] : "",
      scheduleGroups: normalizedGroups,
      maxStudents: classItem.maxStudents,
      cancelEnrollmentBeforeStartDays: String(classItem.cancelEnrollmentBeforeStartDays ?? 0),
      isActive: classItem.isActive,
    });
    setEditingId(classItem.classID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_CLASS, "Are you sure you want to delete this class?"))) {
      try {
        await classService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchClasses();
      } catch (error) {
        console.error("Failed to delete class:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_CLASS, "class")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await classService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}`);
      fetchClasses();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_CLASS_NAME, "Class Name"),
      accessor: "className",
      sortKey: "className",
    },
    {
      header: t(K.ADMIN_TABLE_CLASS_CODE, "Class Code"),
      accessor: "classCode",
      sortKey: "classCode",
      render: (row) => renderEntityPill({
        type: "class",
        id: row.classID,
        label: row.classCode || row.className || String(row.classID),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_COURSE, "Course"),
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "courseName",
      filterKey: "courseID",
      render: (row) => renderLookupEntityPill({
        type: "course",
        id: row.courseID,
        items: courses,
        idField: "courseID",
        labelResolver: (course) => course?.courseCode || row.courseName || course?.courseName || t(K.ADMIN_TABLE_NA, "N/A"),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor"),
      accessor: (row) => {
        if (row.instructorName) {
          return row.instructorName;
        }

        const instructor = instructors.find((item) => item.id === row.instructorID);
        return instructor?.name || t(K.ADMIN_TABLE_NA, "N/A");
      },
      sortKey: "instructorName",
      render: (row) => renderLookupEntityPill({
        type: "instructor",
        id: instructors.find((item) => item.id === row.instructorID)?.userID,
        items: instructors,
        idField: "id",
        labelResolver: (instructor) => row.instructorName || instructor?.name || t(K.ADMIN_TABLE_NA, "N/A"),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_ROOM, "Room"),
      accessor: (row) => row.roomName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "roomName",
      render: (row) => renderEntityPill({
        type: "room",
        id: row.roomID,
        label: row.roomCode || row.roomName || t(K.ADMIN_TABLE_NA, "N/A"),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_START_DATE, "Start Date"),
      accessor: (row) =>
        row.startDate ? formatDateInTimeZone(row.startDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "startDate",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")),
      sortKey: "isActive",
      filterKey: "isActive",
    },
  ];

  const filterableColumns = [
    {
      key: "courseID",
      label: t(K.ADMIN_TABLE_COURSE, "Course"),
      options: courses.map((c) => ({ value: String(c.courseID), label: c.courseName })),
    },
    {
      key: "isActive",
      label: t(K.ADMIN_TABLE_STATUS, "Status"),
      options: [
        { value: "true", label: t(K.ADMIN_TABLE_ACTIVE, "Active") },
        { value: "false", label: t(K.ADMIN_TABLE_INACTIVE, "Inactive") },
      ],
    },
  ];

  const handleFilterApply = (newFilters) => {
    setActiveFilters(newFilters);
    setPage(1);
  };

  const actions = [
    {
      icon: <MdInventory2 className="h-4 w-4" />,
      onClick: (row) => openAssetModal(row.classID),
      label: t(K.ROUTE_ASSETS, "Assets"),
    },
    {
      icon: <MdModeEditOutline className="h-4 w-4" />,
      onClick: (row) => handleEdit(row),
      label: t(K.ADMIN_TABLE_EDIT, "Edit"),
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: (_, rowId) => handleDelete(rowId),
      label: t(K.ADMIN_TABLE_DELETE, "Delete"),
      variant: "danger",
    },
  ];

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setEditingId(null); setFormData(createDefaultFormData()); setShowModal(true); }}
          className="shrink-0 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_CLASS, "Class")}`}
        </button>
        <TableFilterModal filterableColumns={filterableColumns} activeFilters={activeFilters} onFilterApply={handleFilterApply} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <Table
        columns={columns}
        data={classes}
        actions={actions}
        idField="classID"
        onBulkDelete={handleBulkDelete}
        serverPagination
        page={page}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1); }}
        filterableColumns={filterableColumns}
        activeFilters={activeFilters}
      />

      <Modal
        title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_CLASS, "Class")}` : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_CLASS, "Class")}`}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-900"
            >
              {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
            </button>
            <button
              type="submit"
              form="class-form"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
            </button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_CLASS_NAME, "Class Name")} *`}
            </label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_CLASS_NAME, "Enter class name")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_CLASS_CODE, "Class Code")}
            </label>
            <input
              type="text"
              name="classCode"
              value={formData.classCode}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={!editingId ? t(K.ADMIN_TABLE_LEAVE_EMPTY_AUTO_GENERATION, "Leave empty for auto-generation") : t(K.ADMIN_TABLE_ENTER_CLASS_CODE, "Enter class code")}
            />
            {!editingId && (
              <p className="mt-1 text-xs text-gray-500">{t(K.ADMIN_TABLE_AUTO_CODE_EXAMPLE, "If empty, code will be auto-generated (e.g., CLS-000001)")}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_COURSE, "Course")} *`}
            </label>
            <select
              name="courseID"
              value={formData.courseID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_COURSE, "Select a course")}</option>
              {courses.map((course) => (
                <option key={course.courseID} value={course.courseID}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor")} *`}
            </label>
            <select
              name="instructorID"
              value={formData.instructorID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_INSTRUCTOR_REQUIRED, "Select an instructor")}</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name} {instructor.email ? `(${instructor.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_ROOM, "Room")} *`}
            </label>
            <select
              name="roomID"
              value={formData.roomID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_ROOM, "Select a room")}</option>
              {rooms.map((room) => (
                <option key={room.roomID} value={room.roomID}>
                  {room.roomName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_DESCRIPTION, "Description")}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_CLASS_DESCRIPTION, "Enter class description")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_START_DATE, "Start Date")}
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_END_DATE, "End Date")}
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className={`rounded-lg border px-3 py-2 text-sm ${
            isScheduleHoursInsufficient || hasScheduleOverlap
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              : "border-gray-200 bg-gray-50 text-navy-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
          }`}>
            <p>
              <span className="font-semibold">{t(K.ADMIN_TABLE_TOTAL_SCHEDULE_HOURS, "Total scheduled hours")}:</span>{" "}
              {totalScheduledHours.toFixed(2)}
            </p>
            <p>
              <span className="font-semibold">{t(K.ADMIN_TABLE_REQUIRED_COURSE_HOURS, "Required course hours")}:</span>{" "}
              {selectedCourseHours}
            </p>
            {isScheduleHoursInsufficient ? (
              <p className="mt-1 font-medium">
                {t(K.ADMIN_TABLE_SCHEDULE_HOURS_INSUFFICIENT, "Total scheduled hours must be at least course hours.")}
              </p>
            ) : null}
            {hasScheduleOverlap ? (
              <p className="mt-1 font-medium">
                {t(K.ADMIN_TABLE_SCHEDULE_GROUPS_OVERLAP, "Schedule groups cannot overlap on the same day.")}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-navy-700 dark:text-white">
                {`${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} *`}
              </label>
              <button
                type="button"
                onClick={addScheduleGroup}
                className="rounded border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-300"
              >
                {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} +`}
              </button>
            </div>

            {(formData.scheduleGroups || []).map((group, groupIndex) => (
              <div key={`schedule-group-${groupIndex}`} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {`${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} ${groupIndex + 1}`}
                  </p>
                  {(formData.scheduleGroups || []).length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeScheduleGroup(groupIndex)}
                      className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                    >
                      {t(K.ADMIN_TABLE_DELETE, "Delete")}
                    </button>
                  ) : null}
                </div>

                <div className="mb-3">
                  <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                    {`${t(K.ADMIN_TABLE_CLASS_DAYS, "Class Days")} *`}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {scheduleDays.map((day) => {
                      const checked = (Number(group.daysMask) || 0) & day.bit;
                      return (
                        <button
                          type="button"
                          key={`${groupIndex}-${day.bit}`}
                          onClick={() => toggleScheduleDay(groupIndex, day.bit)}
                          className={`rounded border px-3 py-1 text-xs font-semibold ${
                            checked
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                      {`${t(K.ADMIN_TABLE_TIMEFRAME_START, "Start Time")} *`}
                    </label>
                    <input
                      type="time"
                      value={group.startTime}
                      onChange={(e) => handleScheduleGroupTimeChange(groupIndex, "startTime", e.target.value)}
                      required
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                      {`${t(K.ADMIN_TABLE_TIMEFRAME_END, "End Time")} *`}
                    </label>
                    <input
                      type="time"
                      value={group.endTime}
                      onChange={(e) => handleScheduleGroupTimeChange(groupIndex, "endTime", e.target.value)}
                      required
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_MAX_STUDENTS, "Max Students")}
            </label>
            <input
              type="number"
              name="maxStudents"
              value={formData.maxStudents}
              onChange={handleInputChange}
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_MAX_STUDENTS, "Enter max students")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_CANCEL_ENROLLMENT_WINDOW_DAYS, "Enrollment Cancellation Window (days before start)")}
            </label>
            <input
              type="number"
              name="cancelEnrollmentBeforeStartDays"
              value={formData.cancelEnrollmentBeforeStartDays}
              onChange={handleInputChange}
              min="0"
              max="365"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_CANCEL_ENROLLMENT_WINDOW_DAYS, "Enter number of days")}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label className="ml-2 block text-sm text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ACTIVE, "Active")}
            </label>
          </div>

        </form>
      </Modal>

      {/* Class Assets Modal */}
      {showAssetModal && (
        <Modal
          isOpen={showAssetModal}
          onClose={() => {
            setShowAssetModal(false);
            setSelectedAsset(null);
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={t(K.ADMIN_TABLE_CLASS_ROOM_ASSETS, "Class Room Assets")}
          maxWidth={"max-w-4xl"}
          footer={
            <>
              <button
                onClick={() => {
                  setShowAssetModal(false);
                  setSelectedAsset(null);
                  setShowAssignmentModal(false);
                  setSelectedAssignment(null);
                  setClassStudents([]);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-3 gap-4 min-h-96">
            {/* Assets List */}
            <div className="border-r dark:border-gray-700 pr-4">
              <h4 className="font-semibold mb-3 text-sm dark:text-white">{t(K.ADMIN_TABLE_AVAILABLE_ASSETS, "Available Assets")}</h4>
              {classAssets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {t(K.ADMIN_TABLE_NO_ASSETS_IN_ROOM, "No assets found in this class room.")}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {classAssets.map((asset) => (
                    <button
                      key={asset.roomAssetID}
                      onClick={() => handleSelectAsset(asset)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedAsset?.roomAssetID === asset.roomAssetID
                          ? "border-brand-500 bg-brand-50 dark:bg-navy-800 dark:border-brand-400"
                          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                      }`}
                    >
                      <p className="font-semibold text-sm dark:text-white">{asset.assetName || asset.assetCode}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">SN: {asset.serialNumber}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Condition: {getConditionLabel(asset.condition)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Operational: {getOperationalStatusLabel(asset.operationalStatus)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Asset Details and Assignments */}
            {selectedAsset ? (
              <div className="col-span-2 pl-4">
                {/* Asset Details */}
                <div className="mb-4 pb-4 border-b dark:border-gray-700">
                  <h4 className="font-semibold mb-2 dark:text-white">{t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Asset Code</p>
                      <p className="font-medium dark:text-white">{selectedAsset.assetCode || t(K.ADMIN_TABLE_NA, "N/A")}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Serial Number</p>
                      <p className="font-medium dark:text-white">{selectedAsset.serialNumber || t(K.ADMIN_TABLE_NA, "N/A")}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Room</p>
                      {editingAssetRoom ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={newRoomId}
                            onChange={(e) => setNewRoomId(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                            {(rooms || []).map((room) => (
                              <option key={room.roomID} value={room.roomID}>{room.roomName || room.roomID}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateAssetRoom(selectedAsset.roomAssetID)}
                            disabled={isChangingAssetRoom || !newRoomId}
                            className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600 disabled:opacity-60"
                          >
                            {isChangingAssetRoom ? t(K.ADMIN_TABLE_UPDATING, "Updating...") : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAssetRoom(false);
                              setNewRoomId(selectedAsset.roomID ? String(selectedAsset.roomID) : "");
                            }}
                            className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <p className="font-medium dark:text-white">{getRoomName(selectedAsset.roomID)}</p>
                          <button
                            onClick={() => setEditingAssetRoom(true)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {t(K.ADMIN_TABLE_EDIT, "Edit")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Condition</p>
                      {editingAssetCondition ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={newCondition}
                            onChange={(e) => setNewCondition(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                            {conditionOptions.map((opt) => (
                              <option key={opt.itemID} value={opt.itemCode}>{opt.label || opt.itemCode}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateAssetCondition(selectedAsset.roomAssetID, newCondition)}
                            className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAssetCondition(false)}
                            className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <p className="font-medium dark:text-white">{getConditionLabel(selectedAsset.condition)}</p>
                          <button
                            onClick={() => setEditingAssetCondition(true)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {t(K.ADMIN_TABLE_EDIT, "Edit")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Operational Status</p>
                      {editingOperationalStatus ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={newOperationalStatus}
                            onChange={(e) => setNewOperationalStatus(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                            {operationalStatusOptions.map((opt) => (
                              <option key={opt.itemID} value={opt.itemCode}>{opt.label || opt.itemCode}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateOperationalStatus(selectedAsset.roomAssetID, newOperationalStatus)}
                            className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingOperationalStatus(false)}
                            className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <p className="font-medium dark:text-white">{getOperationalStatusLabel(selectedAsset.operationalStatus)}</p>
                          <button
                            onClick={() => setEditingOperationalStatus(true)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {t(K.ADMIN_TABLE_EDIT, "Edit")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assignments */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 dark:text-white">{t(K.ADMIN_TABLE_ASSIGNMENT_STATUS, "Assignment Status")}</h4>
                  {(() => {
                    const activeAssignments = assetAssignments.filter(
                      (a) => a.isActive && !a.unassignedDate
                    );
                    if (activeAssignments.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          {t(K.ADMIN_TABLE_NO_ASSIGNMENTS, "No student assignments for this asset.")}
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <div className="flex flex-wrap gap-2 pb-1">
                          {activeAssignments.map((assignment) => (
                            <button
                              key={`pill-${assignment.assignmentID}`}
                              type="button"
                              onClick={() => openAssignmentModal(assignment)}
                              className={
                                "rounded-full border px-2 py-1 text-xs font-medium transition-colors " +
                                "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                              }
                            >
                              {(assignment.studentCode || t(K.ADMIN_TABLE_NA, "N/A"))} • {(assignment.studentName || t(K.ADMIN_TABLE_NA, "N/A"))}
                            </button>
                          ))}
                        </div>
                        {activeAssignments.map((assignment) => (
                          <div
                            key={assignment.assignmentID}
                            className="p-3 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium dark:bg-blue-900 dark:text-blue-300">
                                {assignment.studentCode}
                              </div>
                              <p className="font-medium text-sm dark:text-white">{assignment.studentName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                              <div>Class: <span className="font-medium dark:text-white">{assignment.classCode || t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                              <div>Status: <span className="font-medium text-green-600 dark:text-green-400">Active</span></div>
                              <div>Assigned: <span className="font-medium dark:text-white">{assignment.assignedDate ? formatDateInTimeZone(assignment.assignedDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                              <div>Unassigned: <span className="font-medium dark:text-white">{assignment.unassignedDate ? formatDateInTimeZone(assignment.unassignedDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                            </div>
                            {assignment.isCheckedOut && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">Checked Out: {assignment.checkedOutAt ? new Date(assignment.checkedOutAt).toLocaleString() : t(K.ADMIN_TABLE_NA, "N/A")}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => openAssignmentModal(assignment)}
                              className="rounded border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300"
                            >
                              {t(K.ADMIN_TABLE_VIEW_DETAILS, "View details")}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Incident Report */}
                <RoomAssetIssueReporter roomAssetId={selectedAsset.roomAssetID} />
              </div>
            ) : (
              <div className="col-span-2 flex items-center justify-center text-gray-400 dark:text-gray-600">
                <p>{t(K.ADMIN_TABLE_SELECT_ASSET, "Select an asset to view details")}</p>
              </div>
            )}

          </div>
        </Modal>
      )}

      {showAssignmentModal && selectedAssignment && (
        <Modal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={t(K.ADMIN_TABLE_ASSIGNMENT_DETAILS, "Assignment Details")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowAssignmentModal(false);
                  setSelectedAssignment(null);
                  setClassStudents([]);
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
              <button
                type="button"
                onClick={handleUnassignStudent}
                disabled={isUnassigningStudent || !selectedAssignment?.isActive}
                className="rounded border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                {isUnassigningStudent
                  ? t(K.ADMIN_TABLE_UPDATING, "Updating...")
                  : t(K.ADMIN_TABLE_UNASSIGN, "Unassign student")}
              </button>
              <button
                type="button"
                onClick={handleChangeAssignedStudent}
                disabled={isChangingStudent || !newStudentId}
                className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isChangingStudent
                  ? t(K.ADMIN_TABLE_UPDATING, "Updating...")
                  : t(K.ADMIN_TABLE_UPDATE_STUDENT, "Change assigned student")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="font-semibold text-navy-700 dark:text-white">{selectedAssignment.studentName || t(K.ADMIN_TABLE_NA, "N/A")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">{selectedAssignment.studentCode || t(K.ADMIN_TABLE_NA, "N/A")}</p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                {t(K.ADMIN_TABLE_CLASS, "Class")}: <span className="font-medium">{selectedAssignment.classCode || t(K.ADMIN_TABLE_NA, "N/A")}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t(K.ADMIN_TABLE_STATUS, "Status")}: <span className={`font-semibold ${selectedAssignment.isActive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {selectedAssignment.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-navy-700 dark:text-white">{t(K.ADMIN_TABLE_STUDENTS, "Students")}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {classStudents.map((student) => (
                  <button
                    key={`student-pill-${student.studentID}`}
                    type="button"
                    onClick={() => setNewStudentId(String(student.studentID))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      String(student.studentID) === String(newStudentId)
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-navy-800 dark:text-brand-300"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    {student.studentCode || t(K.ADMIN_TABLE_NA, "N/A")} • {student.studentName || t(K.ADMIN_TABLE_NA, "N/A")}
                  </button>
                ))}
              </div>
              <select
                value={newStudentId}
                onChange={(event) => setNewStudentId(event.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_STUDENT, "Select student")}</option>
                {classStudents.map((student) => (
                  <option key={`student-option-${student.studentID}`} value={student.studentID}>
                    {student.studentCode || t(K.ADMIN_TABLE_NA, "N/A")} - {student.studentName || t(K.ADMIN_TABLE_NA, "N/A")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

