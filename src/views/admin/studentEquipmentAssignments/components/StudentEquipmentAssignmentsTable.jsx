import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentEquipmentAssignmentService, classService, courseService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import TableFilterModal from "components/table/TableFilterModal";
import TableEntityPill from "components/table/TableEntityPill";
import { MdModeEditOutline, MdDelete, MdLogout } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";

export default function StudentEquipmentAssignmentsTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [assignments, setAssignments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [roomAssets, setRoomAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("assignedDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    studentID: "",
    roomAssetID: "",
    classID: "",
    assignedDate: new Date().toISOString().split("T")[0],
    isActive: true,
  });

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data || []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classService.getAll();
      setClasses(data || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch class details and filter assets when classID changes
  useEffect(() => {
    if (showModal && formData.classID) {
      fetchStudentsAndAssetsForClass(formData.classID);
    } else {
      setStudents([]);
      setRoomAssets([]);
    }
  }, [showModal, formData.classID]);

  const fetchStudentsAndAssetsForClass = async (classID) => {
    try {
      // Fetch the class details to get students and room info
      const classDetails = await classService.getById(classID);
      
      // Extract students from the class if available
      let studentsInClass = [];
      const studentsList = classDetails?.students || classDetails?.Students || [];
      
      if (Array.isArray(studentsList) && studentsList.length > 0) {
        studentsInClass = studentsList
          .map(s => ({
            studentID: s.studentID || s.StudentID,
            studentCode: s.studentCode || s.StudentCode || s.code || "",
            studentName:
              s.studentName ||
              s.StudentName ||
              s.fullName ||
              s.displayName ||
              s.name ||
              s.user?.fullName ||
              s.User?.FullName ||
              "-"
          }))
          .filter(s => s.studentID) // Only include students with valid IDs
          .sort((a, b) => (a.studentCode || "").localeCompare(b.studentCode || ""));
      }
      setStudents(studentsInClass);

      // Fetch available assets and filter by class room
      const availableAssets = await studentEquipmentAssignmentService.getAvailableAssets();
      const classRoomID = classDetails?.roomID;
      
      if (classRoomID && availableAssets) {
        const filteredAssets = availableAssets.filter(
          asset => asset.roomID === classRoomID
        );
        setRoomAssets(filteredAssets);
      } else {
        setRoomAssets([]);
      }
    } catch (error) {
      console.error("Failed to fetch students and assets for class:", error);
      setStudents([]);
      setRoomAssets([]);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [page, pageSize, debouncedSearch, activeFilters, sortBy, sortDirection]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await studentEquipmentAssignmentService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        classID: activeFilters["classID"]?.[0] ? Number(activeFilters["classID"][0]) : undefined,
        isActive: activeFilters["isActive"]?.[0] === undefined ? undefined : activeFilters["isActive"][0] === "true",
      });
      setAssignments(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
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
    try {
      const dataToSend = {
        ...formData,
        studentID: parseInt(formData.studentID),
        roomAssetID: parseInt(formData.roomAssetID),
        classID: parseInt(formData.classID),
      };

      if (editingId) {
        await studentEquipmentAssignmentService.update(editingId, dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await studentEquipmentAssignmentService.create(dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        studentID: "",
        roomAssetID: "",
        classID: "",
        assignedDate: new Date().toISOString().split("T")[0],
        isActive: true,
      });
      fetchAssignments();
    } catch (error) {
      console.error("Failed to save assignment:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (assignment) => {
    setFormData({
      studentID: assignment.studentID,
      roomAssetID: assignment.roomAssetID,
      classID: assignment.classID,
      assignedDate: assignment.assignedDate.split("T")[0],
      isActive: assignment.isActive,
    });
    setEditingId(assignment.assignmentID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_ASSIGNMENT, "Are you sure you want to delete this assignment?"))) {
      try {
        await studentEquipmentAssignmentService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchAssignments();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleUnassign = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_UNASSIGN_EQUIPMENT, "Are you sure you want to unassign this equipment?"))) {
      try {
        await studentEquipmentAssignmentService.unassign(id);
        toast.success(t(K.ADMIN_TABLE_EQUIPMENT_UNASSIGNED_SUCCESSFULLY, "Equipment unassigned successfully"));
        fetchAssignments();
      } catch (error) {
        console.error("Failed to unassign equipment:", error);
        toast.error(`${t(K.ADMIN_TABLE_FAILED_UNASSIGN_EQUIPMENT, "Failed to unassign equipment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await studentEquipmentAssignmentService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}`);
      fetchAssignments();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_STUDENT_CODE, "Student Code"),
      accessor: (row) => row.studentCode || row.studentID,
      sortKey: "studentCode",
      render: (row) => <TableEntityPill entityType="student" row={row} />,
    },
    {
      header: t(K.ADMIN_TABLE_ASSET_CODE, "Asset Code"),
      accessor: (row) => row.assetCode || row.roomAssetID,
      sortKey: "assetCode",
      render: (row) => <TableEntityPill entityType="asset" row={row} />,
    },
    {
      header: t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number"),
      accessor: (row) => row.serialNumber || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_CLASS, "Class"),
      accessor: (row) =>
        classes.find((c) => c.classID === row.classID)?.className || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "className",
      render: (row) => {
        const classData = classes.find((c) => c.classID === row.classID);
        if (!classData) return <span className="text-gray-400">—</span>;
        return <TableEntityPill entityType="class" row={classData} />;
      },
    },
    {
      header: t(K.ADMIN_TABLE_ASSIGNED_DATE, "Assigned Date"),
      accessor: (row) => formatDateInTimeZone(row.assignedDate, userTimeZoneId),
      sortKey: "assignedDate",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_IN_USE, "In Use") : t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned")),
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
      icon: <MdLogout className="h-4 w-4" />,
      onClick: (_, rowId) => handleUnassign(rowId),
      isDisabled: (row) => !row?.isActive,
      label: t(K.ADMIN_TABLE_UNASSIGN, "Unassign"),
      variant: "warning",
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: (_, rowId) => handleDelete(rowId),
      label: t(K.ADMIN_TABLE_DELETE, "Delete"),
      variant: "danger",
    },
  ];

  const filterableColumns = [
    {
      key: "classID",
      label: t(K.ADMIN_TABLE_CLASS, "Class"),
      options: classes.map((c) => {
        const course = courses.find(co => co.courseID === c.courseID);
        const courseCode = course?.courseCode || "";
        return { value: String(c.classID), label: `${courseCode} - ${c.classCode} - ${c.className}` };
      }),
    },
    {
      key: "isActive",
      label: t(K.ADMIN_TABLE_STATUS, "Status"),
      options: [
        { value: "true", label: t(K.ADMIN_TABLE_IN_USE, "In Use") },
        { value: "false", label: t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned") },
      ],
    },
  ];

  const handleFilterApply = (newFilters) => { setActiveFilters(newFilters); setPage(1); };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              studentID: "",
              roomAssetID: "",
              classID: "",
              assignedDate: new Date().toISOString().split("T")[0],
              isActive: true,
            });
            setStudents([]);
            setShowModal(true);
          }}
          className="shrink-0 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")}`}
        </button>
        <TableFilterModal filterableColumns={filterableColumns} activeFilters={activeFilters} onFilterApply={handleFilterApply} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder={t(K.ADMIN_TABLE_SEARCH_STUDENT_CODE_ASSET_CODE, "Search student code, asset code")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <Table
        columns={columns}
        data={assignments}
        actions={actions}
        idField="assignmentID"
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
        filterableColumns={filterableColumns}
        activeFilters={activeFilters}
      />

      <Modal
        title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")}` : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")}`}
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
              form="student-assignment-form"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
            </button>
          </>
        }
      >
        <form id="student-assignment-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_CLASS_REQUIRED, "Class *")}
            </label>
            <select
              name="classID"
              value={formData.classID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_A_CLASS, "Select a class")}</option>
              {classes.map((classItem) => {
                const course = courses.find(c => c.courseID === classItem.courseID);
                const courseCode = course?.courseCode || "";
                return (
                  <option key={classItem.classID} value={classItem.classID}>
                    {courseCode} - {classItem.classCode || ""} - {classItem.className}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_STUDENT_ID_REQUIRED, "Student *")}
            </label>
            <select
              name="studentID"
              value={formData.studentID}
              onChange={handleInputChange}
              disabled={!formData.classID}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
            >
              <option value="">{formData.classID ? t(K.ADMIN_TABLE_SELECT_STUDENT, "Select a student") : "Select a class first"}</option>
              {students.map((student) => (
                <option key={student.studentID} value={student.studentID}>
                  {student.studentCode} - {student.studentName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ROOM_ASSET_ID_REQUIRED, "Room Asset *")}
            </label>
            <select
              name="roomAssetID"
              value={formData.roomAssetID}
              onChange={handleInputChange}
              disabled={!formData.classID}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
            >
              <option value="">{formData.classID ? t(K.ADMIN_TABLE_SELECT_ROOM_ASSET, "Select a room asset") : "Select a class first"}</option>
              {roomAssets.map((asset) => (
                <option key={asset.roomAssetID} value={asset.roomAssetID}>
                  {asset.assetCode} - {asset.serialNumber || "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ASSIGNED_DATE_REQUIRED, "Assigned Date *")}
            </label>
            <input
              type="date"
              name="assignedDate"
              value={formData.assignedDate}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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

