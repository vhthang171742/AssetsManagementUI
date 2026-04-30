import React, { useState, useEffect, useMemo } from "react";
import { workerEquipmentService, userService, roomService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function WorkerEquipmentTable() {
  const [assignments, setAssignments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState({
    workerID: "",
    roomAssetID: "",
    assignedDate: new Date().toISOString().split("T")[0],
    unassignedDate: "",
  });

  useEffect(() => {
    fetchAssignments();
    fetchWorkers();
    fetchEquipment();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await workerEquipmentService.getAll();
      setAssignments(data || []);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      alert(`Failed to fetch assignments: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Backend assignment expects WorkerID (role entity), not UserID.
      const workerList =
        data?.filter((u) => u.roles?.includes("Worker") && u.workerRole?.workerID) || [];
      setWorkers(workerList);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      // Get all room assets (equipment)
      const rooms = await roomService.getAll();
      let allAssets = [];
      for (const room of rooms) {
        const assets = await roomService.getAssets(room.roomID);
        allAssets = [...allAssets, ...assets];
      }
      setEquipment(allAssets || []);
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const validationPayload = {
        workerID: Number(formData.workerID),
        roomAssetID: Number(formData.roomAssetID),
        currentAssignmentID: editingId || null,
      };
      try {
        const validation = await workerEquipmentService.validateReferences(validationPayload);
        if (!validation?.isValid) {
          const details = validation?.errors?.length
            ? "\n• " + validation.errors.join("\n• ")
            : "\n• Please refresh and select valid Worker and Equipment values.";
          alert("Cannot save assignment due to reference validation errors:" + details);
          return;
        }
      } catch (validationError) {
        if (![404, 405].includes(validationError?.statusCode)) {
          throw validationError;
        }
        // Backward compatibility: continue submit if API hasn't deployed validation endpoint yet.
        console.warn("Validation endpoint unavailable, continuing with create/update request.");
      }

      if (editingId) {
        await workerEquipmentService.update(editingId, formData);
        alert("Assignment updated successfully");
      } else {
        await workerEquipmentService.create(formData);
        alert("Assignment created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        workerID: "",
        roomAssetID: "",
        assignedDate: new Date().toISOString().split("T")[0],
        unassignedDate: "",
      });
      fetchAssignments();
    } catch (error) {
      console.error("Failed to save assignment:", error);
      const details = Array.isArray(error.errors) && error.errors.length
        ? "\n• " + error.errors.join("\n• ")
        : "";
      alert(`Failed to save assignment: ${error.message || "Unknown error"}${details}`);
    }
  };

  const handleEdit = (assignment) => {
    setFormData({
      workerID: assignment.workerID,
      roomAssetID: assignment.roomAssetID,
      assignedDate: assignment.assignedDate?.split("T")[0],
      unassignedDate: assignment.unassignedDate?.split("T")[0] || "",
    });
    setEditingId(assignment.assignmentID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await workerEquipmentService.delete(id);
        alert("Assignment deleted successfully");
        fetchAssignments();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert(`Failed to delete assignment: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await workerEquipmentService.bulkDelete(ids);
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
      header: "Worker",
      accessor: (row) =>
      workers.find((w) => w.workerRole?.workerID === row.workerID)?.fullName || "N/A",
    },
    {
      header: "Equipment",
      accessor: (row) =>
        equipment.find((e) => e.roomAssetID === row.roomAssetID)?.assetName || "N/A",
    },
    {
      header: "Assigned Date",
      accessor: (row) => new Date(row.assignedDate).toLocaleDateString(),
    },
    {
      header: "Unassigned Date",
      accessor: (row) =>
        row.unassignedDate ? new Date(row.unassignedDate).toLocaleDateString() : "—",
    },
    {
      header: "Status",
      accessor: (row) => (row.unassignedDate ? "Unassigned" : "Active"),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-500 hover:text-blue-700 transition-colors"
            title="Edit"
          >
            <MdModeEditOutline className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(row.assignmentID)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Delete"
          >
            <MdDelete className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  const filteredAssignments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return assignments.filter((a) => {
      const workerName = workers.find((w) => w.workerRole?.workerID === a.workerID)?.fullName || "";
      const assetName = equipment.find((e) => e.roomAssetID === a.roomAssetID)?.assetName || "";
      const matchesSearch = !query || workerName.toLowerCase().includes(query) || assetName.toLowerCase().includes(query);
      const isActive = !a.unassignedDate;
      const matchesStatus = !statusFilter || (statusFilter === "active" ? isActive : !isActive);
      return matchesSearch && matchesStatus;
    });
  }, [assignments, workers, equipment, searchText, statusFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setFormData({
              workerID: "",
              roomAssetID: "",
              assignedDate: new Date().toISOString().split("T")[0],
              unassignedDate: "",
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Assignment
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-lg">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search worker, equipment"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <Table
          columns={columns}
          data={filteredAssignments}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
          }}
          title={
            editingId
              ? "Edit Worker Equipment Assignment"
              : "Add Worker Equipment Assignment"
          }
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="worker-equipment-form"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="worker-equipment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Worker
              </label>
              <select
                name="workerID"
                value={formData.workerID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Worker</option>
                {workers.map((worker) => (
                  <option key={worker.userID} value={worker.workerRole.workerID}>
                    {worker.fullName || worker.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Equipment
              </label>
              <select
                name="roomAssetID"
                value={formData.roomAssetID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.roomAssetID} value={item.roomAssetID}>
                    {item.assetName} ({item.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Assigned Date
              </label>
              <input
                type="date"
                name="assignedDate"
                value={formData.assignedDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Unassigned Date (Optional)
              </label>
              <input
                type="date"
                name="unassignedDate"
                value={formData.unassignedDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

