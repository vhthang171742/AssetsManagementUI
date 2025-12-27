import React, { useState, useEffect } from "react";
import { departmentService } from "services/api";
import Card from "components/card";
import Modal from "components/modal/Modal";

export default function DepartmentsTable() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    departmentCode: "",
    departmentName: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      alert("Failed to fetch departments");
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
        await departmentService.update(editingId, formData);
        alert("Department updated successfully");
      } else {
        await departmentService.create(formData);
        alert("Department created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        departmentCode: "",
        departmentName: "",
      });
      fetchDepartments();
    } catch (error) {
      console.error("Failed to save department:", error);
      alert("Failed to save department: " + error.message);
    }
  };

  const handleEdit = (department) => {
    setFormData({
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
    });
    setEditingId(department.departmentID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await departmentService.delete(id);
        alert("Department deleted successfully");
        fetchDepartments();
      } catch (error) {
        console.error("Failed to delete department:", error);
        alert("Failed to delete department");
      }
    }
  };

  return (
    <Card extra={"w-full h-full sm:overflow-auto px-2 sm:px-0"}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-navy-700">Departments</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              departmentCode: "",
              departmentName: "",
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Department
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
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.departmentID} className="border-b hover:bg-gray-50">
                  <td className="p-3">{department.departmentCode}</td>
                  <td className="p-3">{department.departmentName}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => handleEdit(department)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(department.departmentID)}
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
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? "Edit Department" : "Add New Department"}
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
                form="departmentForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </>
          }
        >
          <form id="departmentForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Department Code</label>
              <input
                type="text"
                name="departmentCode"
                placeholder="Department Code"
                value={formData.departmentCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Department Name</label>
              <input
                type="text"
                name="departmentName"
                placeholder="Department Name"
                value={formData.departmentName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
