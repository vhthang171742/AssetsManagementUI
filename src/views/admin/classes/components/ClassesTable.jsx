import React, { useState, useEffect } from "react";
import { classService, courseService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function ClassesTable() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    className: "",
    classCode: "",
    description: "",
    courseID: "",
    instructorID: "",
    startDate: "",
    endDate: "",
    maxStudents: "",
    isActive: true,
  });

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchInstructors();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classService.getAll();
      setClasses(data || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      alert(`Failed to fetch classes: ${error.message || "Unknown error"}`);
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

  const fetchInstructors = async () => {
    // Placeholder: In a real app, fetch from instructors endpoint
    setInstructors([
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
    ]);
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
        courseID: parseInt(formData.courseID),
        instructorID: formData.instructorID ? parseInt(formData.instructorID) : null,
        maxStudents: parseInt(formData.maxStudents) || 2147483647,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      if (editingId) {
        await classService.update(editingId, dataToSend);
        alert("Class updated successfully");
      } else {
        await classService.create(dataToSend);
        alert("Class created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        className: "",
        classCode: "",
        description: "",
        courseID: "",
        instructorID: "",
        startDate: "",
        endDate: "",
        maxStudents: "",
        isActive: true,
      });
      fetchClasses();
    } catch (error) {
      console.error("Failed to save class:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save class: " + error.message + details);
    }
  };

  const handleEdit = (classItem) => {
    setFormData({
      className: classItem.className,
      classCode: classItem.classCode,
      description: classItem.description || "",
      courseID: classItem.courseID,
      instructorID: classItem.instructorID || "",
      startDate: classItem.startDate ? classItem.startDate.split("T")[0] : "",
      endDate: classItem.endDate ? classItem.endDate.split("T")[0] : "",
      maxStudents: classItem.maxStudents,
      isActive: classItem.isActive,
    });
    setEditingId(classItem.classID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await classService.delete(id);
        alert("Class deleted successfully");
        fetchClasses();
      } catch (error) {
        console.error("Failed to delete class:", error);
        alert(`Failed to delete class: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await classService.bulkDelete(ids);
      alert("Deleted selected classes");
      fetchClasses();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected classes: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Class Name",
      accessor: "className",
    },
    {
      header: "Class Code",
      accessor: "classCode",
    },
    {
      header: "Course",
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || "N/A",
    },
    {
      header: "Start Date",
      accessor: (row) =>
        row.startDate ? new Date(row.startDate).toLocaleDateString() : "N/A",
    },
    {
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Inactive"),
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
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
          Classes
        </h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              className: "",
              classCode: "",
              description: "",
              courseID: "",
              instructorID: "",
              startDate: "",
              endDate: "",
              maxStudents: "",
              isActive: true,
            });
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + New Class
        </button>
      </div>

      <Table
        columns={columns}
        data={classes}
        actions={actions}
        loading={loading}
        onBulkDelete={handleBulkDelete}
      />

      <Modal
        title={editingId ? "Edit Class" : "Create New Class"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Class Name *
            </label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter class name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Class Code *
            </label>
            <input
              type="text"
              name="classCode"
              value={formData.classCode}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter class code"
            />
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
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter class description"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Max Students
            </label>
            <input
              type="number"
              name="maxStudents"
              value={formData.maxStudents}
              onChange={handleInputChange}
              min="1"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter max students"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label className="ml-2 block text-sm text-navy-700 dark:text-white">
              Active
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
