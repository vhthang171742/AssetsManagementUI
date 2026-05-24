import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { productionStepService, productionOrderService, productionLineService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { renderEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const STATUS_OPTIONS = [
  { value: 0, label: "Planned" },
  { value: 1, label: "In Progress" },
  { value: 2, label: "On Hold" },
  { value: 3, label: "Completed" },
  { value: 4, label: "Cancelled" },
];

const createDefaultFormData = () => ({
  productionOrderID: "",
  stepName: "",
  stepCode: "",
  stepSequence: "1",
  description: "",
  plannedStart: "",
  plannedEnd: "",
  status: 0,
  isActive: true,
});

export default function ProductionStepsTable() {
  const { t } = useLanguage();
  const [steps, setSteps] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [productionLines, setProductionLines] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("stepSequence");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState(createDefaultFormData());
  const [formLineFilter, setFormLineFilter] = useState("");
  const [formFilteredOrders, setFormFilteredOrders] = useState([]);

  useEffect(() => {
    fetchProductionLines();
    fetchAllOrders();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchSteps();
  }, [page, pageSize, debouncedSearch, orderFilter, statusFilter, activeFilter, sortBy, sortDirection]);

  useEffect(() => {
    if (lineFilter) {
      setFilteredOrders(productionOrders.filter((o) => String(o.productionLineID) === String(lineFilter)));
      setOrderFilter("");
    } else {
      setFilteredOrders(productionOrders);
    }
  }, [lineFilter, productionOrders]);

  useEffect(() => {
    if (formLineFilter) {
      setFormFilteredOrders(productionOrders.filter((o) => String(o.productionLineID) === String(formLineFilter)));
    } else {
      setFormFilteredOrders(productionOrders);
    }
    setFormData((prev) => ({ ...prev, productionOrderID: "" }));
  }, [formLineFilter, productionOrders]);

  const fetchProductionLines = async () => {
    try {
      const data = await productionLineService.getAll();
      setProductionLines(data || []);
    } catch { /* non-critical */ }
  };

  const fetchAllOrders = async () => {
    try {
      const data = await productionOrderService.getAll();
      setProductionOrders(data || []);
      setFilteredOrders(data || []);
      setFormFilteredOrders(data || []);
    } catch { /* non-critical */ }
  };

  const fetchSteps = async () => {
    try {
      setLoading(true);
      const data = await productionStepService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        productionOrderID: orderFilter ? Number(orderFilter) : undefined,
        status: statusFilter !== "" ? Number(statusFilter) : undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setSteps(data?.items || []);
      setTotalCount(data?.totalCount || 0);
      if (data?.totalPages && page > data.totalPages) setPage(data.totalPages);
    } catch (error) {
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_PRODUCTION_STEPS, "production steps")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
        productionOrderID: Number(formData.productionOrderID),
        stepSequence: Number(formData.stepSequence) || 1,
        status: Number(formData.status),
        plannedStart: formData.plannedStart || null,
        plannedEnd: formData.plannedEnd || null,
      };

      if (editingId) {
        await productionStepService.update(editingId, dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production step")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await productionStepService.create(dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production step")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(createDefaultFormData());
      setFormLineFilter("");
      fetchSteps();
    } catch (error) {
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_PRODUCTION_STEP, "production step")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (step) => {
    // Find parent order to determine line for the form filter
    const parentOrder = productionOrders.find((o) => o.productionOrderID === step.productionOrderID);
    const lineId = parentOrder ? String(parentOrder.productionLineID) : "";
    setFormLineFilter(lineId);
    setFormData({
      productionOrderID: String(step.productionOrderID || ""),
      stepName: step.stepName || "",
      stepCode: step.stepCode || "",
      stepSequence: String(step.stepSequence ?? 1),
      description: step.description || "",
      plannedStart: step.plannedStart ? step.plannedStart.substring(0, 16) : "",
      plannedEnd: step.plannedEnd ? step.plannedEnd.substring(0, 16) : "",
      status: step.status ?? 0,
      isActive: step.isActive,
    });
    setEditingId(step.productionStepID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_PRODUCTION_STEP, "Are you sure you want to delete this production step?"))) {
      try {
        await productionStepService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production step")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchSteps();
      } catch (error) {
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_PRODUCTION_STEP, "production step")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await productionStepService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_PRODUCTION_STEPS, "production steps")}`);
      fetchSteps();
    } catch (err) {
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_PRODUCTION_STEPS, "production steps")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const getStatusLabel = (status) => STATUS_OPTIONS.find((s) => s.value === status)?.label ?? String(status);
  const getOrderName = (orderId) => productionOrders.find((o) => o.productionOrderID === orderId)?.orderName ?? String(orderId);

  const columns = [
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_STEP_SEQUENCE, "Seq"),
      accessor: "stepSequence",
      sortKey: "stepSequence",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_STEP_NAME, "Step Name"),
      accessor: "stepName",
      sortKey: "stepName",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_STEP_CODE, "Step Code"),
      accessor: "stepCode",
      sortKey: "stepCode",
      render: (row) =>
        renderEntityPill({
          type: "production-step",
          id: row.productionStepID,
          label: row.stepCode || row.stepName || String(row.productionStepID),
          fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
        }),
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production Order"),
      accessor: (row) => getOrderName(row.productionOrderID),
      sortKey: "productionOrderID",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => getStatusLabel(row.status),
      sortKey: "status",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER_PLANNED_START, "Planned Start"),
      accessor: (row) => row.plannedStart ? new Date(row.plannedStart).toLocaleDateString() : t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "plannedStart",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER_PLANNED_END, "Planned End"),
      accessor: (row) => row.plannedEnd ? new Date(row.plannedEnd).toLocaleDateString() : t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "plannedEnd",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Active"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")),
      sortKey: "isActive",
    },
  ];

  const actions = [
    {
      icon: <MdModeEditOutline className="h-4 w-4" />,
      onClick: (row) => handleEdit(row),
      label: t(K.ADMIN_TABLE_EDIT, "Edit"),
    },
    {
      icon: <MdDelete className="h-4 w-4" />,
      onClick: (_, rowId) => handleDelete(rowId),
      label: t(K.ADMIN_TABLE_DELETE, "Delete"),
      variant: "danger",
    },
  ];

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData(createDefaultFormData());
            setFormLineFilter("");
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production Step")}`}
        </button>
        <div className="flex flex-wrap gap-2 md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={lineFilter}
            onChange={(e) => { setLineFilter(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "Lines")}`}</option>
            {productionLines.map((l) => (
              <option key={l.productionLineID} value={l.productionLineID}>{l.lineName}</option>
            ))}
          </select>
          <select
            value={orderFilter}
            onChange={(e) => { setOrderFilter(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDERS, "Orders")}`}</option>
            {filteredOrders.map((o) => (
              <option key={o.productionOrderID} value={o.productionOrderID}>{o.orderName}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
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
        data={steps}
        serverPagination
        totalItems={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={(key, dir) => { setSortBy(key); setSortDirection(dir); setPage(1); }}
        actions={actions}
        idField="productionStepID"
        onBulkDelete={handleBulkDelete}
      />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setFormData(createDefaultFormData()); setFormLineFilter(""); }}
        title={editingId
          ? `${t(K.ADMIN_TABLE_UPDATE, "Update")} ${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production Step")}`
          : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_PRODUCTION_STEP, "Production Step")}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditingId(null); setFormData(createDefaultFormData()); setFormLineFilter(""); }}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
            </button>
            <button
              type="submit"
              form="productionStepForm"
              className="rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
            >
              {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
            </button>
          </>
        }
      >
        <form id="productionStepForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Cascading line→order selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}
            </label>
            <select
              value={formLineFilter}
              onChange={(e) => setFormLineFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "Lines")}`}</option>
              {productionLines.map((l) => (
                <option key={l.productionLineID} value={l.productionLineID}>{l.lineName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production Order")} *`}
            </label>
            <select
              name="productionOrderID"
              value={formData.productionOrderID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_PRODUCTION_ORDER, "Select Production Order")}</option>
              {formFilteredOrders.map((o) => (
                <option key={o.productionOrderID} value={o.productionOrderID}>{o.orderName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {`${t(K.ADMIN_TABLE_PRODUCTION_STEP_NAME, "Step Name")} *`}
              </label>
              <input
                type="text"
                name="stepName"
                value={formData.stepName}
                onChange={handleInputChange}
                required
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ENTER_PRODUCTION_STEP_NAME, "Enter step name")}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_STEP_CODE, "Step Code")}
              </label>
              <input
                type="text"
                name="stepCode"
                value={formData.stepCode}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={!editingId ? t(K.ADMIN_TABLE_LEAVE_EMPTY_AUTO_GENERATION, "Leave empty for auto-generation") : "STEP-001"}
              />
              {!editingId && (
                <p className="mt-1 text-xs text-gray-500">{t(K.ADMIN_TABLE_AUTO_CODE_EXAMPLE, "If empty, code will be auto-generated (e.g., STP-000001)")}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {`${t(K.ADMIN_TABLE_PRODUCTION_STEP_SEQUENCE, "Sequence")} *`}
              </label>
              <input
                type="number"
                name="stepSequence"
                value={formData.stepSequence}
                onChange={handleInputChange}
                required
                min="1"
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_STATUS, "Status")}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_PLANNED_START, "Planned Start")}
              </label>
              <input
                type="datetime-local"
                name="plannedStart"
                value={formData.plannedStart}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_PLANNED_END, "Planned End")}
              </label>
              <input
                type="datetime-local"
                name="plannedEnd"
                value={formData.plannedEnd}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_DESCRIPTION, "Description")}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_DESCRIPTION, "Description")}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              id="stepIsActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="stepIsActive" className="text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ACTIVE, "Active")}
            </label>
          </div>

        </form>
      </Modal>
    </Card>
  );
}
