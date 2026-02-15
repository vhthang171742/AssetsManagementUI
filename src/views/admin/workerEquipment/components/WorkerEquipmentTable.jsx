import React, { useState, useEffect } from "react";
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
      const data = await userService.getAll();
      // Filter to get only workers if userType exists
      const workerList = data?.filter((u) => u.userType === "Worker" || !u.userType) || [];
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
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save assignment: " + error.message + details);
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
        workers.find((w) => w.userID === row.workerID)?.displayName || "N/A",
    },
    {
      header: "Equipment",
      accessor: (row) =>
        equipment.find((e) => e.roomAssetID === row.roomAssetID)?.asset?.assetName || "N/A",
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

  return (
    <Card extra={"w-full sm:overflow-auto"}>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center text-xl font-bold text-navy-700 dark:text-white">
          Worker Equipment Assignments
        </div>

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
          className="linear rounded-lg bg-blue-500 px-4 py-2 text-white transition duration-200 hover:bg-blue-600 active:bg-blue-700"
        >
          Add Assignment
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <Table
          columns={columns}
          data={assignments}
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
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Worker
              </label>
              <select
                name="workerID"
                value={formData.workerID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              >
                <option value="">Select Worker</option>
                {workers.map((worker) => (
                  <option key={worker.userID} value={worker.userID}>
                    {worker.displayName || worker.mail}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Equipment
              </label>
              <select
                name="roomAssetID"
                value={formData.roomAssetID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.roomAssetID} value={item.roomAssetID}>
                    {item.asset?.assetName} ({item.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Assigned Date
              </label>
              <input
                type="date"
                name="assignedDate"
                value={formData.assignedDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Unassigned Date (Optional)
              </label>
              <input
                type="date"
                name="unassignedDate"
                value={formData.unassignedDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
