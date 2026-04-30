import React, { useState, useEffect } from "react";
import { productionLineService, departmentService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function ProductionLinesTable() {
  const [lines, setLines] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    departmentID: "",
    lineName: "",
    lineCode: "",
    orderCode: "",
    capacity: "",
    isActive: true,
  });

  useEffect(() => {
    fetchProductionLines();
    fetchDepartments();
  }, []);

  const fetchProductionLines = async () => {
    try {
      setLoading(true);
      const data = await productionLineService.getAll();
      setLines(data || []);
    } catch (error) {
      console.error("Failed to fetch production lines:", error);
      alert(`Failed to fetch production lines: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getAll();
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
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
      if (editingId) {
        await productionLineService.update(editingId, formData);
        alert("Production line updated successfully");
      } else {
        await productionLineService.create(formData);
        alert("Production line created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        departmentID: "",
        lineName: "",
        lineCode: "",
        orderCode: "",
        capacity: "",
        isActive: true,
      });
      fetchProductionLines();
    } catch (error) {
      console.error("Failed to save production line:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save production line: " + error.message + details);
    }
  };

  const handleEdit = (line) => {
    setFormData({
      departmentID: line.departmentID,
      lineName: line.lineName,
      lineCode: line.lineCode,
      orderCode: line.orderCode,
      capacity: line.capacity,
      isActive: line.isActive,
    });
    setEditingId(line.productionLineID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this production line?")) {
      try {
        await productionLineService.delete(id);
        alert("Production line deleted successfully");
        fetchProductionLines();
      } catch (error) {
        console.error("Failed to delete production line:", error);
        alert(`Failed to delete production line: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await productionLineService.bulkDelete(ids);
      alert("Deleted selected production lines");
      fetchProductionLines();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected production lines: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Line Name",
      accessor: "lineName",
    },
    {
      header: "Line Code",
      accessor: "lineCode",
    },
    {
      header: "Department",
      accessor: (row) =>
        departments.find((d) => d.departmentID === row.departmentID)
          ?.departmentName || "N/A",
    },
    {
      header: "Order Code",
      accessor: "orderCode",
    },
    {
      header: "Capacity",
      accessor: "capacity",
    },
    {
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Inactive"),
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
            onClick={() => handleDelete(row.productionLineID)}
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
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center">
        <button
          onClick={() => {
            setFormData({
              departmentID: "",
              lineName: "",
              lineCode: "",
              orderCode: "",
              capacity: "",
              isActive: true,
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Production Line
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <Table
          columns={columns}
          data={lines}
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
          title={editingId ? "Edit Production Line" : "Add Production Line"}
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
                form="production-line-form"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="production-line-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Department
              </label>
              <select
                name="departmentID"
                value={formData.departmentID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.departmentID} value={dept.departmentID}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Line Name
              </label>
              <input
                type="text"
                name="lineName"
                value={formData.lineName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter line name"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Line Code
              </label>
              <input
                type="text"
                name="lineCode"
                value={formData.lineCode}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter line code"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Order Code
              </label>
              <input
                type="text"
                name="orderCode"
                value={formData.orderCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter order code"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter capacity"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                id="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="px-3 py-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-white">
                Active
              </label>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

