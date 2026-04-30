import React, { useState, useEffect } from "react";
import { courseService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";

export default function CoursesTable() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    courseName: "",
    courseCode: "",
    description: "",
    durationHours: "",
    isActive: true,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAll();
      setCourses(data || []);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      alert(`Failed to fetch courses: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
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
        durationHours: parseInt(formData.durationHours) || 0,
      };

      if (editingId) {
        await courseService.update(editingId, dataToSend);
        alert("Course updated successfully");
      } else {
        await courseService.create(dataToSend);
        alert("Course created successfully");
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        courseName: "",
        courseCode: "",
        description: "",
        durationHours: "",
        isActive: true,
      });
      fetchCourses();
    } catch (error) {
      console.error("Failed to save course:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      alert("Failed to save course: " + error.message + details);
    }
  };

  const handleEdit = (course) => {
    setFormData({
      courseName: course.courseName,
      courseCode: course.courseCode,
      description: course.description || "",
      durationHours: course.durationHours,
      isActive: course.isActive,
    });
    setEditingId(course.courseID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await courseService.delete(id);
        alert("Course deleted successfully");
        fetchCourses();
      } catch (error) {
        console.error("Failed to delete course:", error);
        alert(`Failed to delete course: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await courseService.bulkDelete(ids);
      alert("Deleted selected courses");
      fetchCourses();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete selected courses: ${err.message || "Unknown error"}`);
      throw err;
    }
  };

  const columns = [
    {
      header: "Course Name",
      accessor: "courseName",
    },
    {
      header: "Course Code",
      accessor: "courseCode",
    },
    {
      header: "Duration (Hours)",
      accessor: "durationHours",
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
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              courseName: "",
              courseCode: "",
              description: "",
              durationHours: "",
              isActive: true,
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          Add Course
        </button>
      </div>

      <Table
        columns={columns}
        data={courses}
        actions={actions}
        loading={loading}
        onBulkDelete={handleBulkDelete}
      />

      <Modal
        title={editingId ? "Edit Course" : "Create New Course"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="course-form"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <form id="course-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Course Name *
            </label>
            <input
              type="text"
              name="courseName"
              value={formData.courseName}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter course name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Course Code *
            </label>
            <input
              type="text"
              name="courseCode"
              value={formData.courseCode}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter course code (e.g., CS101)"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter course description"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              Duration (Hours) *
            </label>
            <input
              type="number"
              name="durationHours"
              value={formData.durationHours}
              onChange={handleInputChange}
              required
              min="0"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter duration in hours"
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

        </form>
      </Modal>
    </Card>
  );
}

