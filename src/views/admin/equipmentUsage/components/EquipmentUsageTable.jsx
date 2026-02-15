import React, { useState, useEffect } from "react";
import { equipmentUsageService, userService, roomService, productionLineService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function EquipmentUsageTable() {
  const [usageLogs, setUsageLogs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    roomAssetID: "",
    workerID: "",
    productionLineID: "",
    startTime: new Date().toISOString(),
    endTime: "",
    runningMinutes: "",
    downtimeMinutes: "",
    stitchCount: "",
    notes: "",
  });

  useEffect(() => {
    fetchUsageLogs();
    fetchWorkers();
    fetchEquipment();
    fetchLines();
  }, []);

  const fetchUsageLogs = async () => {
    try {
      setLoading(true);
      const data = await equipmentUsageService.getAll();
      setUsageLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch usage logs:", error);
      alert(`Failed to fetch usage logs: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await userService.getAll();
      const workerList = data?.filter((u) => u.userType === "Worker" || !u.userType) || [];
      setWorkers(workerList);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
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

  const fetchLines = async () => {
    try {
      const data = await productionLineService.getAll();
      setLines(data || []);
    } catch (error) {
      console.error("Failed to fetch production lines:", error);
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
        await equipmentUsageService.update(editingId, formData);
        alert("Usage log updated successfully");
      } else {
        await equipmentUsageService.create(formData);
        alert("Usage log created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        roomAssetID: "",
        workerID: "",
        productionLineID: "",
        startTime: new Date().toISOString(),
        endTime: "",
        runningMinutes: "",
        downtimeMinutes: "",
        stitchCount: "",
        notes: "",
      });
      fetchUsageLogs();
    } catch (error) {
      console.error("Failed to save usage log:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save usage log: " + error.message + details);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      roomAssetID: log.roomAssetID,
      workerID: log.workerID,
      productionLineID: log.productionLineID,
      startTime: log.startTime,
      endTime: log.endTime || "",
      runningMinutes: log.runningMinutes || "",
      downtimeMinutes: log.downtimeMinutes || "",
      stitchCount: log.stitchCount || "",
      notes: log.notes || "",
    });
    setEditingId(log.usageLogID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this usage log?")) {
      try {
        await equipmentUsageService.delete(id);
        alert("Usage log deleted successfully");
        fetchUsageLogs();
      } catch (error) {
        console.error("Failed to delete usage log:", error);
        alert(`Failed to delete usage log: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await equipmentUsageService.bulkDelete(ids);
      alert("Deleted selected usage logs");
      fetchUsageLogs();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected usage logs: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Equipment",
      accessor: (row) =>
        equipment.find((e) => e.roomAssetID === row.roomAssetID)?.asset?.assetName || "N/A",
    },
    {
      header: "Worker",
      accessor: (row) =>
        workers.find((w) => w.userID === row.workerID)?.displayName || "N/A",
    },
    {
      header: "Production Line",
      accessor: (row) =>
        lines.find((l) => l.productionLineID === row.productionLineID)?.lineName || "N/A",
    },
    {
      header: "Start Time",
      accessor: (row) => new Date(row.startTime).toLocaleString(),
    },
    {
      header: "End Time",
      accessor: (row) =>
        row.endTime ? new Date(row.endTime).toLocaleString() : "—",
    },
    {
      header: "Running Minutes",
      accessor: "runningMinutes",
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
            onClick={() => handleDelete(row.usageLogID)}
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
          Equipment Usage Logs
        </div>

        <button
          onClick={() => {
            setFormData({
              roomAssetID: "",
              workerID: "",
              productionLineID: "",
              startTime: new Date().toISOString(),
              endTime: "",
              runningMinutes: "",
              downtimeMinutes: "",
              stitchCount: "",
              notes: "",
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="linear rounded-lg bg-blue-500 px-4 py-2 text-white transition duration-200 hover:bg-blue-600 active:bg-blue-700"
        >
          Log Equipment Usage
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <Table
          columns={columns}
          data={usageLogs}
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
          title={editingId ? "Edit Usage Log" : "Log Equipment Usage"}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                Production Line
              </label>
              <select
                name="productionLineID"
                value={formData.productionLineID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              >
                <option value="">Select Production Line</option>
                {lines.map((line) => (
                  <option key={line.productionLineID} value={line.productionLineID}>
                    {line.lineName} ({line.lineCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime.slice(0, 16)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: new Date(e.target.value).toISOString(),
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                End Time (Optional)
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime ? formData.endTime.slice(0, 16) : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Running Minutes
              </label>
              <input
                type="number"
                name="runningMinutes"
                value={formData.runningMinutes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                placeholder="e.g., 480"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Downtime Minutes
              </label>
              <input
                type="number"
                name="downtimeMinutes"
                value={formData.downtimeMinutes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                placeholder="e.g., 30"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Stitch Count (Optional)
              </label>
              <input
                type="number"
                name="stitchCount"
                value={formData.stitchCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                placeholder="e.g., 5000"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                placeholder="Add any notes about the usage"
                rows="3"
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
                {editingId ? "Update" : "Log Usage"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
