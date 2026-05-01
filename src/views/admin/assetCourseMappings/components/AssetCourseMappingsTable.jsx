import React, { useState, useEffect, useMemo } from "react";
import { assetCourseMappingService, courseService, assetService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function AssetCourseMappingsTable() {
  const { t } = useLanguage();
  const [mappings, setMappings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [requiredFilter, setRequiredFilter] = useState("");
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
      alert(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_MAPPINGS, "mappings")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
        alert(`${t(K.ADMIN_TABLE_MAPPING, "Mapping")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await assetCourseMappingService.create(dataToSend);
        alert(`${t(K.ADMIN_TABLE_MAPPING, "Mapping")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
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
      alert(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_MAPPING, "mapping")}: ${error.message}${details}`);
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
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_MAPPING, "Are you sure you want to delete this mapping?"))) {
      try {
        await assetCourseMappingService.delete(id);
        alert(`${t(K.ADMIN_TABLE_MAPPING, "Mapping")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchMappings();
      } catch (error) {
        console.error("Failed to delete mapping:", error);
        alert(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_MAPPING, "mapping")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await assetCourseMappingService.bulkDelete(ids);
      alert(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_MAPPINGS, "mappings")}`);
      fetchMappings();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_MAPPINGS, "mappings")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_ASSET, "Asset"),
      accessor: (row) =>
        assets.find((a) => a.assetID === row.assetID)?.assetName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_COURSE, "Course"),
      accessor: (row) =>
        courses.find((c) => c.courseID === row.courseID)?.courseName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_REQUIRED, "Required"),
      accessor: (row) => (row.isRequired ? t(K.ADMIN_TABLE_YES, "Yes") : t(K.ADMIN_TABLE_NO, "No")),
    },
  ];

  const actions = [
    {
      icon: <MdModeEditOutline className="h-4 w-4" />,
      onClick: handleEdit,
      label: t(K.ADMIN_TABLE_EDIT, "Edit"),
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: handleDelete,
      label: t(K.ADMIN_TABLE_DELETE, "Delete"),
      variant: "danger",
    },
  ];

  const filteredMappings = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return mappings.filter((m) => {
      const assetName = assets.find((a) => a.assetID === m.assetID)?.assetName || "";
      const courseName = courses.find((c) => c.courseID === m.courseID)?.courseName || "";
      const matchesSearch = !query || assetName.toLowerCase().includes(query) || courseName.toLowerCase().includes(query);
      const matchesCourse = !courseFilter || String(m.courseID) === courseFilter;
      const matchesRequired = !requiredFilter || String(m.isRequired) === requiredFilter;
      return matchesSearch && matchesCourse && matchesRequired;
    });
  }, [mappings, assets, courses, searchText, courseFilter, requiredFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_MAPPING, "Mapping")}`}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t(K.ADMIN_TABLE_SEARCH_ASSET_COURSE, "Search asset, course")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_COURSES, "Courses")}`}</option>
            {courses.map((c) => (
              <option key={c.courseID} value={c.courseID}>{c.courseName}</option>
            ))}
          </select>
          <select
            value={requiredFilter}
            onChange={(e) => setRequiredFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{t(K.ADMIN_TABLE_ALL, "All")}</option>
            <option value="true">{t(K.ADMIN_TABLE_REQUIRED, "Required")}</option>
            <option value="false">{t(K.ADMIN_TABLE_OPTIONAL, "Optional")}</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredMappings}
        actions={actions}
        loading={loading}
        onBulkDelete={handleBulkDelete}
      />

      <Modal
        title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_MAPPING, "Mapping")}` : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_MAPPING, "Mapping")}`}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-900"
            >
              {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
            </button>
            <button
              type="submit"
              form="asset-course-mapping-form"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
            </button>
          </>
        }
      >
        <form id="asset-course-mapping-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_ASSET, "Asset")} *`}
            </label>
            <select
              name="assetID"
              value={formData.assetID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_ASSET, "Select an asset")}</option>
              {assets.map((asset) => (
                <option key={asset.assetID} value={asset.assetID}>
                  {asset.assetName} ({asset.assetCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_COURSE, "Course")} *`}
            </label>
            <select
              name="courseID"
              value={formData.courseID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_COURSE, "Select a course")}</option>
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
              {t(K.ADMIN_TABLE_REQUIRED_FOR_COURSE, "Required for Course")}
            </label>
          </div>

        </form>
      </Modal>
    </Card>
  );
}

