import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { productionLineService, departmentService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function ProductionLinesTable() {
  const { t } = useLanguage();
  const [lines, setLines] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
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
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "production lines")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production line")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await productionLineService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production line")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
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
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "production line")}: ${error.message}${details}`);
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
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_PRODUCTION_LINE, "Are you sure you want to delete this production line?"))) {
      try {
        await productionLineService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production line")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchProductionLines();
      } catch (error) {
        console.error("Failed to delete production line:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "production line")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await productionLineService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "production lines")}`);
      fetchProductionLines();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "production lines")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_LINE_NAME, "Line Name"),
      accessor: "lineName",
    },
    {
      header: t(K.ADMIN_TABLE_LINE_CODE, "Line Code"),
      accessor: "lineCode",
    },
    {
      header: t(K.ADMIN_TABLE_DEPARTMENT, "Department"),
      accessor: (row) =>
        departments.find((d) => d.departmentID === row.departmentID)
          ?.departmentName || t(K.ADMIN_TABLE_NA, "N/A"),
    },
    {
      header: t(K.ADMIN_TABLE_ORDER_CODE, "Order Code"),
      accessor: "orderCode",
    },
    {
      header: t(K.ADMIN_TABLE_CAPACITY, "Capacity"),
      accessor: "capacity",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")),
    },
    {
      header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-500 hover:text-blue-700 transition-colors"
            title={t(K.ADMIN_TABLE_EDIT, "Edit")}
          >
            <MdModeEditOutline className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(row.productionLineID)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title={t(K.ADMIN_TABLE_DELETE, "Delete")}
          >
            <MdDelete className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  const filteredLines = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return lines.filter((l) => {
      const matchesSearch = !query || l.lineName?.toLowerCase().includes(query) || l.lineCode?.toLowerCase().includes(query) || l.orderCode?.toLowerCase().includes(query);
      const matchesDept = !departmentFilter || String(l.departmentID) === departmentFilter;
      const matchesActive = !activeFilter || String(l.isActive) === activeFilter;
      return matchesSearch && matchesDept && matchesActive;
    });
  }, [lines, searchText, departmentFilter, activeFilter]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}`}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_DEPARTMENTS, "Departments")}`}</option>
            {departments.map((d) => (
              <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            <option value="true">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</option>
            <option value="false">{t(K.ADMIN_TABLE_INACTIVE, "Inactive")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          columns={columns}
          data={filteredLines}
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
          title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}` : `${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}`}
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
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="production-line-form"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="production-line-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_DEPARTMENT, "Department")}
              </label>
              <select
                name="departmentID"
                value={formData.departmentID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_DEPARTMENT, "Select Department")}</option>
                {departments.map((dept) => (
                  <option key={dept.departmentID} value={dept.departmentID}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_LINE_NAME, "Line Name")}
              </label>
              <input
                type="text"
                name="lineName"
                value={formData.lineName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ENTER_LINE_NAME, "Enter line name")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_LINE_CODE, "Line Code")}
              </label>
              <input
                type="text"
                name="lineCode"
                value={formData.lineCode}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ENTER_LINE_CODE, "Enter line code")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_ORDER_CODE, "Order Code")}
              </label>
              <input
                type="text"
                name="orderCode"
                value={formData.orderCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ENTER_ORDER_CODE, "Enter order code")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_CAPACITY, "Capacity")}
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ENTER_CAPACITY, "Enter capacity")}
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
                {t(K.ADMIN_TABLE_ACTIVE, "Active")}
              </label>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

