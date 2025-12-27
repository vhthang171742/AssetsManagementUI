import React, { useState, useEffect } from "react";
import { assetService, assetCategoryService } from "services/api";
import Card from "components/card";
import Modal from "components/modal/Modal";

export default function AssetsTable() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    assetCode: "",
    assetName: "",
    categoryID: "",
    brand: "",
    model: "",
    specification: "",
    countryOfOrigin: "",
    quantity: 0,
    unit: "",
    unitPrice: "",
    purchaseDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchUnits();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getAll();
      setAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      alert("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await assetCategoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      const data = await assetService.getUnits();
      setUnits(data || []);
    } catch (error) {
      console.error("Failed to fetch units:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "unitPrice" ? parseFloat(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await assetService.update(editingId, formData);
        alert("Asset updated successfully");
      } else {
        await assetService.create(formData);
        alert("Asset created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        assetCode: "",
        assetName: "",
        categoryID: "",
        brand: "",
        model: "",
        specification: "",
        countryOfOrigin: "",
        quantity: 0,
        unit: "",
        unitPrice: "",
        purchaseDate: "",
        notes: "",
      });
      fetchAssets();
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert("Failed to save asset: " + error.message);
    }
  };

  const handleEdit = (asset) => {
    setFormData(asset);
    setEditingId(asset.assetID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await assetService.delete(id);
        alert("Asset deleted successfully");
        fetchAssets();
      } catch (error) {
        console.error("Failed to delete asset:", error);
        alert("Failed to delete asset");
      }
    }
  };

  const getCategoryName = (categoryID) => {
    const category = categories.find((c) => c.categoryID === categoryID);
    return category ? category.categoryName : "Unknown";
  };

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-navy-700">Assets Management</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              assetCode: "",
              assetName: "",
              categoryID: "",
              brand: "",
              model: "",
              specification: "",
              countryOfOrigin: "",
              quantity: 0,
              unit: "",
              unitPrice: "",
              purchaseDate: "",
              notes: "",
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Asset
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Brand</th>
                <th className="text-left p-3">Quantity</th>
                <th className="text-left p-3">Unit Price</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.assetID} className="border-b hover:bg-gray-50">
                  <td className="p-3">{asset.assetCode}</td>
                  <td className="p-3">{asset.assetName}</td>
                  <td className="p-3">{getCategoryName(asset.categoryID)}</td>
                  <td className="p-3">{asset.brand}</td>
                  <td className="p-3">{asset.quantity}</td>
                  <td className="p-3">${asset.unitPrice?.toFixed(2)}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => handleEdit(asset)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.assetID)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          {/* using shared Modal component */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingId ? "Edit Asset" : "Add New Asset"}
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
                  form="assetForm"
                  className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </>
            }
          >
            <form id="assetForm" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  name="assetCode"
                  placeholder="Asset Code"
                  value={formData.assetCode}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                />
                <input
                  type="text"
                  name="assetName"
                  placeholder="Asset Name"
                  value={formData.assetName}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                />
                <select
                  name="categoryID"
                  value={formData.categoryID}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryID} value={cat.categoryID}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="brand"
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <input
                  type="text"
                  name="model"
                  placeholder="Model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <input
                  type="text"
                  name="specification"
                  placeholder="Specification"
                  value={formData.specification}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <input
                  type="text"
                  name="countryOfOrigin"
                  placeholder="Country of Origin"
                  value={formData.countryOfOrigin}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <input
                  type="number"
                  name="quantity"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                />
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  required
                >
                  <option value="">Select Unit</option>
                  {units.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="unitPrice"
                  placeholder="Unit Price"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                  step="0.01"
                />
                <input
                  type="datetime-local"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded"
                />
                <textarea
                  name="notes"
                  placeholder="Notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="col-span-2 p-2 border rounded"
                />
              </div>
            </form>
          </Modal>
        </>
      )}
    </Card>
  );
}
