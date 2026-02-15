import React, { useState, useEffect } from "react";
import { maintenanceRecordService, assetService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";

export default function MaintenanceRecordsTable() {
  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [failureCategories, setFailureCategories] = useState([]);
  const [completionStatuses, setCompletionStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    assetID: "",
    scheduleID: null,
    maintenanceTypeItemID: "",
    maintenanceDate: "",
    technicianID: "",
    failureCategoryItemID: "",
    rootCause: "",
    repairDurationMinutes: "",
    completionStatusItemID: "",
    notes: "",
  });

  useEffect(() => {
    fetchRecords();
    fetchAssets();
    fetchMaintenanceTypes();
    fetchTechnicians();
    fetchFailureCategories();
    fetchCompletionStatuses();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await maintenanceRecordService.getAll();
      setRecords(data || []);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      alert(`Failed to fetch records: ${error.message || "Unknown error"}`);
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

  const fetchTechnicians = async () => {
    try {
      const data = await dropdownService.getTechnicians();
      setTechnicians(data || []);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
    }
  };

  const fetchFailureCategories = async () => {
    try {
      const data = await dropdownService.getFailureCategories();
      setFailureCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch failure categories:", error);
    }
  };

  const fetchCompletionStatuses = async () => {
    try {
      const data = await dropdownService.getCompletionStatuses();
      setCompletionStatuses(data || []);
    } catch (error) {
      console.error("Failed to fetch completion statuses:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "repairDurationMinutes" ? parseInt(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      // Convert empty strings to null for optional fields
      if (!payload.scheduleID) payload.scheduleID = null;
      if (!payload.technicianID) payload.technicianID = null;
      if (!payload.failureCategoryItemID) payload.failureCategoryItemID = null;
      if (!payload.completionStatusItemID) payload.completionStatusItemID = null;

      if (editingId) {
        await maintenanceRecordService.update(editingId, payload);
        alert("Record updated successfully");
      } else {
        await maintenanceRecordService.create(payload);
        alert("Record created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error("Failed to save record:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save record: " + error.message + details);
    }
  };

  const handleEdit = (record) => {
    setFormData({
      assetID: record.assetID,
      scheduleID: record.scheduleID || "",
      maintenanceTypeItemID: record.maintenanceTypeItemID,
      maintenanceDate: record.maintenanceDate ? record.maintenanceDate.substring(0, 16) : "",
      technicianID: record.technicianID || "",
      failureCategoryItemID: record.failureCategoryItemID || "",
      rootCause: record.rootCause || "",
      repairDurationMinutes: record.repairDurationMinutes || "",
      completionStatusItemID: record.completionStatusItemID || "",
      notes: record.notes || "",
    });
    setEditingId(record.recordID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await maintenanceRecordService.delete(id);
        alert("Record deleted successfully");
        fetchRecords();
      } catch (error) {
        console.error("Failed to delete record:", error);
        alert(`Failed to delete record: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await maintenanceRecordService.bulkDelete(ids);
      alert("Deleted selected records");
      fetchRecords();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected records: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      assetID: "",
      scheduleID: null,
      maintenanceTypeItemID: "",
      maintenanceDate: "",
      technicianID: "",
      failureCategoryItemID: "",
      rootCause: "",
      repairDurationMinutes: "",
      completionStatusItemID: "",
      notes: "",
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

  const getTechnicianName = (technicianID) => {
    if (!technicianID) return "N/A";
    const tech = technicians.find((t) => t.technicianID === technicianID);
    return tech ? tech.fullName : "Unknown";
  };

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Maintenance Record
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <Table
          data={records}
          pageSize={10}
          height={'calc(100vh - 240px)'}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          columns={[
            { header: 'Asset', accessor: 'assetID', render: (row) => getAssetName(row.assetID) },
            { header: 'Type', accessor: 'maintenanceTypeItemID', render: (row) => getMaintenanceTypeName(row.maintenanceTypeItemID) },
            { header: 'Date', accessor: 'maintenanceDate', render: (row) => new Date(row.maintenanceDate).toLocaleDateString() },
            { header: 'Technician', accessor: 'technicianID', render: (row) => getTechnicianName(row.technicianID) },
            { header: 'Duration (min)', accessor: 'repairDurationMinutes' },
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
                    onClick={() => handleDelete(row.recordID)}
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
          title={editingId ? "Edit Maintenance Record" : "Add New Maintenance Record"}
          maxWidth={"max-w-3xl"}
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
                form="recordForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="recordForm" onSubmit={handleSubmit}>
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
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Maintenance Type</option>
                {maintenanceTypes.map((type) => (
                  <option key={type.itemID} value={type.itemID}>
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">Maintenance Date</label>
                <input
                  type="datetime-local"
                  name="maintenanceDate"
                  value={formData.maintenanceDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <select
                name="technicianID"
                value={formData.technicianID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Technician (Optional)</option>
                {technicians.map((tech) => (
                  <option key={tech.technicianID} value={tech.technicianID}>
                    {tech.fullName}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="repairDurationMinutes"
                placeholder="Repair Duration (minutes)"
                value={formData.repairDurationMinutes}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <select
                name="failureCategoryItemID"
                value={formData.failureCategoryItemID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Failure Category (Optional)</option>
                {failureCategories.map((cat) => (
                  <option key={cat.itemID} value={cat.itemID}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                name="completionStatusItemID"
                value={formData.completionStatusItemID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Completion Status (Optional)</option>
                {completionStatuses.map((status) => (
                  <option key={status.itemID} value={status.itemID}>
                    {status.label}
                  </option>
                ))}
              </select>

              <textarea
                name="rootCause"
                placeholder="Root Cause"
                value={formData.rootCause}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="2"
              />

              <textarea
                name="notes"
                placeholder="Notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="2"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
