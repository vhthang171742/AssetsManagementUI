import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { departmentService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function DepartmentsTable() {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
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
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_DEPARTMENTS, "departments")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
        toast.success(`${t(K.ADMIN_TABLE_DEPARTMENT, "Department")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await departmentService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_DEPARTMENT, "Department")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
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
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_DEPARTMENT, "department")}: ${error.message}${details}`);
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
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_DEPARTMENT, "Are you sure you want to delete this department?"))) {
      try {
        await departmentService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_DEPARTMENT, "Department")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchDepartments();
      } catch (error) {
        console.error("Failed to delete department:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_DEPARTMENT, "department")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await departmentService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_DEPARTMENTS, "departments")}`);
      fetchDepartments();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_DEPARTMENTS, "departments")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const filteredDepartments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return departments.filter((d) =>
      !query ||
      d.departmentCode?.toLowerCase().includes(query) ||
      d.departmentName?.toLowerCase().includes(query)
    );
  }, [departments, searchText]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_DEPARTMENT, "Department")}`}
        </button>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t(K.ADMIN_TABLE_SEARCH_CODE_NAME, "Search code, name")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white md:w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          data={filteredDepartments}
          pageSize={10}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="departmentID"
          columns={[
            { header: t(K.ADMIN_TABLE_CODE, "Code"), accessor: 'departmentCode' },
            { header: t(K.ADMIN_TABLE_NAME, "Name"), accessor: 'departmentName' },
            {
              header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(row)}
                    title={t(K.ADMIN_TABLE_EDIT, "Edit")}
                    aria-label={t(K.ADMIN_TABLE_EDIT, "Edit")}
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <MdModeEditOutline className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(row.departmentID)}
                    title={t(K.ADMIN_TABLE_DELETE, "Delete")}
                    aria-label={t(K.ADMIN_TABLE_DELETE, "Delete")}
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

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_DEPARTMENT, "Department")}` : `${t(K.ADMIN_TABLE_ADD_NEW, "Add New")} ${t(K.ADMIN_TABLE_DEPARTMENT, "Department")}`}
          maxWidth={"max-w-md"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="departmentForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="departmentForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_DEPARTMENT_CODE, "Department Code")}</label>
              <input
                type="text"
                name="departmentCode"
                placeholder={t(K.ADMIN_TABLE_DEPARTMENT_CODE, "Department Code")}
                value={formData.departmentCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_DEPARTMENT_NAME, "Department Name")}</label>
              <input
                type="text"
                name="departmentName"
                placeholder={t(K.ADMIN_TABLE_DEPARTMENT_NAME, "Department Name")}
                value={formData.departmentName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

