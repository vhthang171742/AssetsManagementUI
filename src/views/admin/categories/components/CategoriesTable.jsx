import React, { useState, useEffect } from "react";
import { assetCategoryService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import Modal from "components/modal/Modal";

export default function CategoriesTable() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await assetCategoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      alert("Failed to fetch categories");
    } finally {
      setLoading(false);
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
        await assetCategoryService.update(editingId, formData);
        alert("Category updated successfully");
      } else {
        await assetCategoryService.create(formData);
        alert("Category created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        categoryName: "",
        description: "",
      });
      fetchCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category: " + error.message);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      categoryName: category.categoryName,
      description: category.description,
    });
    setEditingId(category.categoryID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await assetCategoryService.delete(id);
        alert("Category deleted successfully");
        fetchCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert("Failed to delete category");
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await assetCategoryService.bulkDelete(ids);
      alert("Deleted selected categories");
      fetchCategories();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      throw err;
    }
  };

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              categoryName: "",
              description: "",
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <Table
          data={categories}
          pageSize={10}
          height={'calc(100vh - 240px)'}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="categoryID"
          columns={[
            { header: 'Category Name', accessor: 'categoryName' },
            { header: 'Description', accessor: 'description' },
            {
              header: 'Actions',
              render: (row) => (
                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(row)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(row.categoryID)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? "Edit Category" : "Add New Category"}
          maxWidth={"max-w-md"}
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
                form="categoryForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="categoryForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category Name</label>
              <input
                type="text"
                name="categoryName"
                placeholder="Category Name"
                value={formData.categoryName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                rows="4"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
