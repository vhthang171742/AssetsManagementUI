import React, { useState, useEffect, useMemo } from "react";
import { studentEquipmentAssignmentService, classService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdLogout } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function StudentEquipmentAssignmentsTable() {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [formData, setFormData] = useState({
    studentID: "",
    roomAssetID: "",
    classID: "",
    assignedDate: new Date().toISOString().split("T")[0],
    isActive: true,
  });

  useEffect(() => {
    fetchAssignments();
    fetchClasses();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await studentEquipmentAssignmentService.getAll();
      setAssignments(data || []);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      alert(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
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
        alert(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await studentEquipmentAssignmentService.create(dataToSend);
        alert(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
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
      alert(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message}${details}`);
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
        alert(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchAssignments();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleUnassign = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_UNASSIGN_EQUIPMENT, "Are you sure you want to unassign this equipment?"))) {
      try {
        await studentEquipmentAssignmentService.unassign(id);
        alert(t(K.ADMIN_TABLE_EQUIPMENT_UNASSIGNED_SUCCESSFULLY, "Equipment unassigned successfully"));
        fetchAssignments();
      } catch (error) {
        console.error("Failed to unassign equipment:", error);
        alert(`${t(K.ADMIN_TABLE_FAILED_UNASSIGN_EQUIPMENT, "Failed to unassign equipment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await studentEquipmentAssignmentService.bulkDelete(ids);
      alert(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}`);
      fetchAssignments();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_STUDENT_ID, "Student ID"),
      accessor: "studentID",
    },
    {
      header: t(K.ADMIN_TABLE_ASSET_ID, "Asset ID"),
      accessor: "roomAssetID",
    },
    {
      header: t(K.ADMIN_TABLE_CLASS, "Class"),
      accessor: (row) =>
        classes.find((c) => c.classID === row.classID)?.className || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_ASSIGNED_DATE, "Assigned Date"),
      accessor: (row) => new Date(row.assignedDate).toLocaleDateString(),
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned")),
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

  const filteredAssignments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return assignments.filter((a) => {
      const matchesSearch = !query || String(a.studentID).includes(query) || String(a.roomAssetID).includes(query);
      const matchesClass = !classFilter || String(a.classID) === classFilter;
      const matchesActive = !activeFilter || String(a.isActive) === activeFilter;
      return matchesSearch && matchesClass && matchesActive;
    });
  }, [assignments, searchText, classFilter, activeFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")}`}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t(K.ADMIN_TABLE_SEARCH_STUDENT_ID_ASSET_ID, "Search student ID, asset ID")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_CLASSES, "Classes")}`}</option>
            {classes.map((c) => (
              <option key={c.classID} value={c.classID}>{c.className}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            <option value="true">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</option>
            <option value="false">{t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned")}</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredAssignments}
        actions={actions}
        idField="assignmentID"
        loading={loading}
        onBulkDelete={handleBulkDelete}
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
              {t(K.ADMIN_TABLE_STUDENT_ID_REQUIRED, "Student ID *")}
            </label>
            <input
              type="number"
              name="studentID"
              value={formData.studentID}
              onChange={handleInputChange}
              required
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_STUDENT_ID, "Enter student ID")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ROOM_ASSET_ID_REQUIRED, "Room Asset ID *")}
            </label>
            <input
              type="number"
              name="roomAssetID"
              value={formData.roomAssetID}
              onChange={handleInputChange}
              required
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_ROOM_ASSET_ID, "Enter room asset ID")}
            />
          </div>

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
              {classes.map((classItem) => (
                <option key={classItem.classID} value={classItem.classID}>
                  {classItem.className}
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

