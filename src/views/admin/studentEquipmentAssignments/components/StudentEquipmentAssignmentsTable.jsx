import React, { useState, useEffect, useMemo } from "react";
import { studentEquipmentAssignmentService, classService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdLogout } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function StudentEquipmentAssignmentsTable() {
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
      alert(`Failed to fetch assignments: ${error.message || "Unknown error"}`);
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
        alert("Assignment updated successfully");
      } else {
        await studentEquipmentAssignmentService.create(dataToSend);
        alert("Assignment created successfully");
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
      alert("Failed to save assignment: " + error.message + details);
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
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await studentEquipmentAssignmentService.delete(id);
        alert("Assignment deleted successfully");
        fetchAssignments();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert(`Failed to delete assignment: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleUnassign = async (id) => {
    if (window.confirm("Are you sure you want to unassign this equipment?")) {
      try {
        await studentEquipmentAssignmentService.unassign(id);
        alert("Equipment unassigned successfully");
        fetchAssignments();
      } catch (error) {
        console.error("Failed to unassign equipment:", error);
        alert(`Failed to unassign equipment: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await studentEquipmentAssignmentService.bulkDelete(ids);
      alert("Deleted selected assignments");
      fetchAssignments();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected assignments: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Student ID",
      accessor: "studentID",
    },
    {
      header: "Asset ID",
      accessor: "roomAssetID",
    },
    {
      header: "Class",
      accessor: (row) =>
        classes.find((c) => c.classID === row.classID)?.className || "N/A",
    },
    {
      header: "Assigned Date",
      accessor: (row) => new Date(row.assignedDate).toLocaleDateString(),
    },
    {
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Unassigned"),
    },
  ];

  const actions = [
    {
      icon: <MdModeEditOutline className="h-4 w-4" />,
      onClick: handleEdit,
      label: "Edit",
    },
    {
      icon: <MdLogout className="h-4 w-4" />,
      onClick: handleUnassign,
      label: "Unassign",
      variant: "warning",
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: handleDelete,
      label: "Delete",
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
          Add Assignment
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search student ID, asset ID"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.classID} value={c.classID}>{c.className}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Unassigned</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredAssignments}
        actions={actions}
        loading={loading}
        onBulkDelete={handleBulkDelete}
      />

      <Modal
        title={editingId ? "Edit Assignment" : "Create New Assignment"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="student-assignment-form"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <form id="student-assignment-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Student ID *
            </label>
            <input
              type="number"
              name="studentID"
              value={formData.studentID}
              onChange={handleInputChange}
              required
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter student ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Room Asset ID *
            </label>
            <input
              type="number"
              name="roomAssetID"
              value={formData.roomAssetID}
              onChange={handleInputChange}
              required
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter room asset ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Class *
            </label>
            <select
              name="classID"
              value={formData.classID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a class</option>
              {classes.map((classItem) => (
                <option key={classItem.classID} value={classItem.classID}>
                  {classItem.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Assigned Date *
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
              Active
            </label>
          </div>

        </form>
      </Modal>
    </Card>
  );
}

