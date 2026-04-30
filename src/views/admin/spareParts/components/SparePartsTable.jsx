import React, { useState, useEffect } from "react";
import { sparePartService } from "services/api";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdWarning } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";

export default function SparePartsTable() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    partName: "",
    partCode: "",
    manufacturer: "",
    compatibleMachineTypes: "",
    unitPrice: "",
    stockQuantity: "",
    reorderLevel: "",
    isActive: true,
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const data = await sparePartService.getAll();
      setParts(data || []);
    } catch (error) {
      console.error("Failed to fetch parts:", error);
      alert(`Failed to fetch parts: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : 
              name === "stockQuantity" || name === "reorderLevel" ? parseInt(value) || "" :
              name === "unitPrice" ? parseFloat(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await sparePartService.update(editingId, formData);
        alert("Part updated successfully");
      } else {
        await sparePartService.create(formData);
        alert("Part created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchParts();
    } catch (error) {
      console.error("Failed to save part:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save part: " + error.message + details);
    }
  };

  const handleEdit = (part) => {
    setFormData({
      partName: part.partName,
      partCode: part.partCode,
      manufacturer: part.manufacturer || "",
      compatibleMachineTypes: part.compatibleMachineTypes || "",
      unitPrice: part.unitPrice || "",
      stockQuantity: part.stockQuantity,
      reorderLevel: part.reorderLevel,
      isActive: part.isActive,
    });
    setEditingId(part.partID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this part?")) {
      try {
        await sparePartService.delete(id);
        alert("Part deleted successfully");
        fetchParts();
      } catch (error) {
        console.error("Failed to delete part:", error);
        alert(`Failed to delete part: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await sparePartService.bulkDelete(ids);
      alert("Deleted selected parts");
      fetchParts();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected parts: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      partName: "",
      partCode: "",
      manufacturer: "",
      compatibleMachineTypes: "",
      unitPrice: "",
      stockQuantity: "",
      reorderLevel: "",
      isActive: true,
    });
  };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center">
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Spare Part
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <Table
          data={parts}
          pageSize={10}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          columns={[
            { header: 'Part Code', accessor: 'partCode' },
            { header: 'Part Name', accessor: 'partName' },
            { header: 'Manufacturer', accessor: 'manufacturer', render: (row) => row.manufacturer || 'N/A' },
            { 
              header: 'Stock', 
              accessor: 'stockQuantity',
              render: (row) => (
                <span className={row.needsReorder ? 'text-red-600 font-bold flex items-center gap-1' : ''}>
                  {row.needsReorder && <MdWarning className="h-4 w-4" />}
                  {row.stockQuantity}
                </span>
              )
            },
            { header: 'Reorder Level', accessor: 'reorderLevel' },
            { header: 'Unit Price', accessor: 'unitPrice', render: (row) => row.unitPrice != null ? `$${parseFloat(row.unitPrice).toFixed(2)}` : 'N/A' },
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
                    onClick={() => handleDelete(row.partID)}
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
          title={editingId ? "Edit Spare Part" : "Add New Spare Part"}
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
                form="partForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="partForm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                name="partCode"
                placeholder="Part Code"
                value={formData.partCode}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
              <input
                type="text"
                name="partName"
                placeholder="Part Name"
                value={formData.partName}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
              
              <input
                type="text"
                name="manufacturer"
                placeholder="Manufacturer (Optional)"
                value={formData.manufacturer}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <input
                type="text"
                name="compatibleMachineTypes"
                placeholder="Compatible Machine Types (comma-separated)"
                value={formData.compatibleMachineTypes}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <input
                type="number"
                name="stockQuantity"
                placeholder="Stock Quantity"
                value={formData.stockQuantity}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <input
                type="number"
                name="reorderLevel"
                placeholder="Reorder Level"
                value={formData.reorderLevel}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <input
                type="number"
                name="unitPrice"
                placeholder="Unit Price"
                value={formData.unitPrice}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                step="0.01"
              />

              <div className="col-span-1 flex items-center">
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

