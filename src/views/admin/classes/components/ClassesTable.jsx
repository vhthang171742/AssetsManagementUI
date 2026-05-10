import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { classService, courseService, roomService } from "services/api";
import { getAllUsers } from "services/userService";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";
import { utcClockTimeToTimeZone } from "services/dateTimeService";

export default function ClassesTable() {
  const { t } = useLanguage();
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
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
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
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchClasses();
  }, [page, pageSize, debouncedSearch, courseFilter, activeFilter, sortBy, sortDirection]);

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
        courseID: courseFilter ? Number(courseFilter) : undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
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
    },
    {
      header: t(K.ADMIN_TABLE_COURSE, "Course"),
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "courseName",
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
    },
    {
      header: t(K.ADMIN_TABLE_ROOM, "Room"),
      accessor: (row) => row.roomName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "roomName",
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
    },
  ];

  const actions = [
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData(createDefaultFormData());
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_CLASS, "Class")}`}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_COURSES, "Courses")}`}</option>
            {courses.map((c) => (
              <option key={c.courseID} value={c.courseID}>{c.courseName}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            <option value="true">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</option>
            <option value="false">{t(K.ADMIN_TABLE_INACTIVE, "Inactive")}</option>
          </select>
        </div>
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
        onSortChange={(key, direction) => {
          setSortBy(key);
          setSortDirection(direction);
          setPage(1);
        }}
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
              {`${t(K.ADMIN_TABLE_CLASS_CODE, "Class Code")} *`}
            </label>
            <input
              type="text"
              name="classCode"
              value={formData.classCode}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_CLASS_CODE, "Enter class code")}
            />
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
    </Card>
  );
}

