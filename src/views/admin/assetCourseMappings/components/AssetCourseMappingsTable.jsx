import React, { useState, useEffect } from "react";
import { assetCourseMappingService, courseService, assetService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function AssetCourseMappingsTable() {
  const [mappings, setMappings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    assetID: "",
    courseID: "",
    isRequired: false,
  });

  useEffect(() => {
    fetchMappings();
    fetchCourses();
    fetchAssets();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const data = await assetCourseMappingService.getAll();
      setMappings(data || []);
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
      alert(`Failed to fetch mappings: ${error.message || "Unknown error"}`);
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

  const fetchAssets = async () => {
    try {
      const data = await assetService.getAll();
      setAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
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
        assetID: parseInt(formData.assetID),
        courseID: parseInt(formData.courseID),
      };

      if (editingId) {
        await assetCourseMappingService.update(editingId, dataToSend);
        alert("Mapping updated successfully");
      } else {
        await assetCourseMappingService.create(dataToSend);
        alert("Mapping created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        assetID: "",
        courseID: "",
        isRequired: false,
      });
      fetchMappings();
    } catch (error) {
      console.error("Failed to save mapping:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save mapping: " + error.message + details);
    }
  };

  const handleEdit = (mapping) => {
    setFormData({
      assetID: mapping.assetID,
      courseID: mapping.courseID,
      isRequired: mapping.isRequired,
    });
    setEditingId(mapping.mappingID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this mapping?")) {
      try {
        await assetCourseMappingService.delete(id);
        alert("Mapping deleted successfully");
        fetchMappings();
      } catch (error) {
        console.error("Failed to delete mapping:", error);
        alert(`Failed to delete mapping: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await assetCourseMappingService.bulkDelete(ids);
      alert("Deleted selected mappings");
      fetchMappings();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected mappings: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Asset",
      accessor: (row) =>
        assets.find((a) => a.assetID === row.assetID)?.assetName || "N/A",
    },
    {
      header: "Course",
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || "N/A",
    },
    {
      header: "Required",
      accessor: (row) => (row.isRequired ? "Yes" : "No"),
    },
  ];

  const actions = [
    {
      icon: <MdModeEditOutline className="h-4 w-4" />,
      onClick: handleEdit,
      label: "Edit",
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: handleDelete,
      label: "Delete",
      variant: "danger",
    },
  ];

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
      <div className="flex items-center">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              assetID: "",
              courseID: "",
              isRequired: false,
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Mapping
        </button>
      </div>

      <Table
        columns={columns}
        data={mappings}
        actions={actions}
        loading={loading}
        onBulkDelete={handleBulkDelete}
      />

      <Modal
        title={editingId ? "Edit Mapping" : "Create New Mapping"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Asset *
            </label>
            <select
              name="assetID"
              value={formData.assetID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select an asset</option>
              {assets.map((asset) => (
                <option key={asset.assetID} value={asset.assetID}>
                  {asset.assetName} ({asset.assetCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Course *
            </label>
            <select
              name="courseID"
              value={formData.courseID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.courseID} value={course.courseID}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isRequired"
              checked={formData.isRequired}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label className="ml-2 block text-sm text-navy-700 dark:text-white">
              Required for Course
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
