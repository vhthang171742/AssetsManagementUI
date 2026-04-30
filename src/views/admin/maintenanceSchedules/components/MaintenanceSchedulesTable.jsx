import React, { useState, useEffect, useMemo } from "react";
import { maintenanceScheduleService, assetService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";

export default function MaintenanceSchedulesTable() {
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [formData, setFormData] = useState({
    assetID: "",
    maintenanceTypeItemID: "",
    frequency: "",
    description: "",
    lastMaintenanceDate: "",
    nextDueDate: "",
    isActive: true,
  });

  useEffect(() => {
    fetchSchedules();
    fetchAssets();
    fetchMaintenanceTypes();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await maintenanceScheduleService.getAll();
      setSchedules(data || []);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      alert(`Failed to fetch schedules: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const data = await assetService.getAll();
      setAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const fetchMaintenanceTypes = async () => {
    try {
      const data = await dropdownService.getMaintenanceTypes();
      setMaintenanceTypes(data || []);
    } catch (error) {
      console.error("Failed to fetch maintenance types:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "frequency" ? parseInt(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await maintenanceScheduleService.update(editingId, formData);
        alert("Schedule updated successfully");
      } else {
        await maintenanceScheduleService.create(formData);
        alert("Schedule created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error("Failed to save schedule:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save schedule: " + error.message + details);
    }
  };

  const handleEdit = (schedule) => {
    setFormData({
      assetID: schedule.assetID,
      maintenanceTypeItemID: schedule.maintenanceTypeItemID,
      frequency: schedule.frequency,
      description: schedule.description || "",
      lastMaintenanceDate: schedule.lastMaintenanceDate ? schedule.lastMaintenanceDate.substring(0, 16) : "",
      nextDueDate: schedule.nextDueDate ? schedule.nextDueDate.substring(0, 16) : "",
      isActive: schedule.isActive,
    });
    setEditingId(schedule.scheduleID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      try {
        await maintenanceScheduleService.delete(id);
        alert("Schedule deleted successfully");
        fetchSchedules();
      } catch (error) {
        console.error("Failed to delete schedule:", error);
        alert(`Failed to delete schedule: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await maintenanceScheduleService.bulkDelete(ids);
      alert("Deleted selected schedules");
      fetchSchedules();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected schedules: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      assetID: "",
      maintenanceTypeItemID: "",
      frequency: "",
      description: "",
      lastMaintenanceDate: "",
      nextDueDate: "",
      isActive: true,
    });
  };

  const getAssetName = (assetID) => {
    const asset = assets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : "Unknown";
  };

  const getMaintenanceTypeName = (itemID) => {
    const type = maintenanceTypes.find((t) => t.itemID === itemID);
    return type ? type.label : "Unknown";
  };

  const filteredSchedules = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return schedules.filter((s) => {
      const assetName = assets.find((a) => a.assetID === s.assetID)?.assetName || "";
      const matchesSearch = !query || assetName.toLowerCase().includes(query) || s.description?.toLowerCase().includes(query);
      const matchesAsset = !assetFilter || String(s.assetID) === assetFilter;
      const matchesType = !typeFilter || String(s.maintenanceTypeItemID) === typeFilter;
      const matchesActive = !activeFilter || String(s.isActive) === activeFilter;
      return matchesSearch && matchesAsset && matchesType && matchesActive;
    });
  }, [schedules, assets, searchText, assetFilter, typeFilter, activeFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Maintenance Schedule
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-3xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search asset, description"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Assets</option>
            {assets.map((a) => (
              <option key={a.assetID} value={a.assetID}>{a.assetName}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            {maintenanceTypes.map((t) => (
              <option key={t.itemID} value={t.itemID}>{t.label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <Table
          data={filteredSchedules}
          pageSize={10}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          columns={[
            { header: 'Asset', accessor: 'assetID', render: (row) => getAssetName(row.assetID) },
            { header: 'Type', accessor: 'maintenanceTypeItemID', render: (row) => getMaintenanceTypeName(row.maintenanceTypeItemID) },
            { header: 'Frequency', accessor: 'frequency', render: (row) => `${row.frequency} days/hours` },
            { header: 'Last Maintenance', accessor: 'lastMaintenanceDate', render: (row) => row.lastMaintenanceDate ? new Date(row.lastMaintenanceDate).toLocaleDateString() : 'N/A' },
            { header: 'Next Due', accessor: 'nextDueDate', render: (row) => row.nextDueDate ? new Date(row.nextDueDate).toLocaleDateString() : 'N/A' },
            { header: 'Active', accessor: 'isActive', render: (row) => row.isActive ? '✓' : '✗' },
            {
              header: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(row)}
                    title="Edit"
                    aria-label="Edit"
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <MdModeEditOutline className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(row.scheduleID)}
                    title="Delete"
                    aria-label="Delete"
                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <MdDelete className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? "Edit Maintenance Schedule" : "Add New Maintenance Schedule"}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="scheduleForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="scheduleForm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select
                name="assetID"
                value={formData.assetID}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Asset</option>
                {assets.map((asset) => (
                  <option key={asset.assetID} value={asset.assetID}>
                    {asset.assetName} ({asset.assetCode})
                  </option>
                ))}
              </select>

              <select
                name="maintenanceTypeItemID"
                value={formData.maintenanceTypeItemID}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Maintenance Type</option>
                {maintenanceTypes.map((type) => (
                  <option key={type.itemID} value={type.itemID}>
                    {type.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="frequency"
                placeholder="Frequency (days or hours)"
                value={formData.frequency}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="3"
              />

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">Last Maintenance Date</label>
                <input
                  type="datetime-local"
                  name="lastMaintenanceDate"
                  value={formData.lastMaintenanceDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">Next Due Date</label>
                <input
                  type="datetime-local"
                  name="nextDueDate"
                  value={formData.nextDueDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                  id="isActive"
                />
                <label htmlFor="isActive" className="dark:text-white">Active</label>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

