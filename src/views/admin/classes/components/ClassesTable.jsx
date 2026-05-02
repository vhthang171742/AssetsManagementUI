import React, { useState, useEffect, useMemo } from "react";
import { classService, courseService, roomService } from "services/api";
import { getAllUsers } from "services/userService";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function ClassesTable() {
  const { t } = useLanguage();
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [formData, setFormData] = useState({
    className: "",
    classCode: "",
    description: "",
    courseID: "",
    instructorID: "",
    startDate: "",
    endDate: "",
    maxStudents: "",
    roomID: "",
    scheduleDaysMask: 0,
    scheduleStartTime: "",
    scheduleEndTime: "",
    isActive: true,
  });

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchInstructors();
    fetchRooms();
  }, []);

  const scheduleDays = [
    { bit: 1 << 1, label: t(K.ADMIN_TABLE_MON, "Mon") },
    { bit: 1 << 2, label: t(K.ADMIN_TABLE_TUE, "Tue") },
    { bit: 1 << 3, label: t(K.ADMIN_TABLE_WED, "Wed") },
    { bit: 1 << 4, label: t(K.ADMIN_TABLE_THU, "Thu") },
    { bit: 1 << 5, label: t(K.ADMIN_TABLE_FRI, "Fri") },
    { bit: 1 << 6, label: t(K.ADMIN_TABLE_SAT, "Sat") },
    { bit: 1 << 0, label: t(K.ADMIN_TABLE_SUN, "Sun") },
  ];

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classService.getAll();
      setClasses(data || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      alert(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
    if (!(Number(formData.scheduleDaysMask) > 0)) {
      alert(t(K.ADMIN_TABLE_SELECT_AT_LEAST_ONE_DAY, "Select at least one class day."));
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        courseID: parseInt(formData.courseID),
        instructorID: formData.instructorID ? parseInt(formData.instructorID) : null,
        roomID: formData.roomID ? parseInt(formData.roomID) : null,
        maxStudents: parseInt(formData.maxStudents) || 2147483647,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        scheduleDaysMask: Number(formData.scheduleDaysMask) || 0,
        scheduleStartTime: formData.scheduleStartTime ? `${formData.scheduleStartTime}:00` : null,
        scheduleEndTime: formData.scheduleEndTime ? `${formData.scheduleEndTime}:00` : null,
      };

      if (editingId) {
        await classService.update(editingId, dataToSend);
        alert(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await classService.create(dataToSend);
        alert(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        className: "",
        classCode: "",
        description: "",
        courseID: "",
        instructorID: "",
        roomID: "",
        startDate: "",
        endDate: "",
        scheduleDaysMask: 0,
        scheduleStartTime: "",
        scheduleEndTime: "",
        maxStudents: "",
        isActive: true,
      });
      fetchClasses();
    } catch (error) {
      console.error("Failed to save class:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_CLASS, "class")}: ${error.message}${details}`);
    }
  };

  const normalizeTime = (value) => {
    if (!value) {
      return "";
    }

    return String(value).slice(0, 5);
  };

  const toggleScheduleDay = (bit) => {
    setFormData((prev) => {
      const currentMask = Number(prev.scheduleDaysMask) || 0;
      const nextMask = currentMask & bit ? currentMask & ~bit : currentMask | bit;
      return {
        ...prev,
        scheduleDaysMask: nextMask,
      };
    });
  };

  const handleEdit = (classItem) => {
    setFormData({
      className: classItem.className,
      classCode: classItem.classCode,
      description: classItem.description || "",
      courseID: classItem.courseID,
      instructorID: classItem.instructorID || "",
      roomID: classItem.roomID || "",
      startDate: classItem.startDate ? classItem.startDate.split("T")[0] : "",
      endDate: classItem.endDate ? classItem.endDate.split("T")[0] : "",
      scheduleDaysMask: classItem.scheduleDaysMask || 0,
      scheduleStartTime: normalizeTime(classItem.scheduleStartTime),
      scheduleEndTime: normalizeTime(classItem.scheduleEndTime),
      maxStudents: classItem.maxStudents,
      isActive: classItem.isActive,
    });
    setEditingId(classItem.classID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_CLASS, "Are you sure you want to delete this class?"))) {
      try {
        await classService.delete(id);
        alert(`${t(K.ADMIN_TABLE_CLASS, "Class")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchClasses();
      } catch (error) {
        console.error("Failed to delete class:", error);
        alert(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_CLASS, "class")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await classService.bulkDelete(ids);
      alert(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}`);
      fetchClasses();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_CLASSES, "classes")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_CLASS_NAME, "Class Name"),
      accessor: "className",
    },
    {
      header: t(K.ADMIN_TABLE_CLASS_CODE, "Class Code"),
      accessor: "classCode",
    },
    {
      header: t(K.ADMIN_TABLE_COURSE, "Course"),
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor"),
      accessor: (row) => row.instructorName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_ROOM, "Room"),
      accessor: (row) => row.roomName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_START_DATE, "Start Date"),
      accessor: (row) =>
        row.startDate ? new Date(row.startDate).toLocaleDateString() : t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")),
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

  const filteredClasses = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return classes.filter((c) => {
      const matchesSearch = !query || c.className?.toLowerCase().includes(query) || c.classCode?.toLowerCase().includes(query);
      const matchesCourse = !courseFilter || String(c.courseID) === courseFilter;
      const matchesActive = !activeFilter || String(c.isActive) === activeFilter;
      return matchesSearch && matchesCourse && matchesActive;
    });
  }, [classes, searchText, courseFilter, activeFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              className: "",
              classCode: "",
              description: "",
              courseID: "",
              instructorID: "",
              roomID: "",
              startDate: "",
              endDate: "",
              scheduleDaysMask: 0,
              scheduleStartTime: "",
              scheduleEndTime: "",
              maxStudents: "",
              isActive: true,
            });
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
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_COURSES, "Courses")}`}</option>
            {courses.map((c) => (
              <option key={c.courseID} value={c.courseID}>{c.courseName}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
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
        data={filteredClasses}
        actions={actions}
        idField="classID"
        loading={loading}
        onBulkDelete={handleBulkDelete}
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
              {t(K.ADMIN_TABLE_INSTRUCTOR, "Instructor")}
            </label>
            <select
              name="instructorID"
              value={formData.instructorID}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_INSTRUCTOR_OPTIONAL, "Select an instructor (optional)")}</option>
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

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_CLASS_DAYS, "Class Days")} *`}
            </label>
            <div className="flex flex-wrap gap-2">
              {scheduleDays.map((day) => {
                const checked = (Number(formData.scheduleDaysMask) || 0) & day.bit;
                return (
                  <button
                    type="button"
                    key={day.bit}
                    onClick={() => toggleScheduleDay(day.bit)}
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

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_TIMEFRAME_START, "Start Time")} *`}
            </label>
            <input
              type="time"
              name="scheduleStartTime"
              value={formData.scheduleStartTime}
              onChange={handleInputChange}
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
              name="scheduleEndTime"
              value={formData.scheduleEndTime}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
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

