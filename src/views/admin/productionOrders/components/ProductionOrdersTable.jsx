import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { productionOrderService, productionLineService } from "services/api";
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

const PRIORITY_OPTIONS = [
  { value: 0, label: "Low" },
  { value: 1, label: "Normal" },
  { value: 2, label: "High" },
  { value: 3, label: "Critical" },
];

const createDefaultFormData = () => ({
  productionLineID: "",
  orderCode: "",
  orderName: "",
  description: "",
  batchNumber: "",
  lotNumber: "",
  targetQuantity: "",
  plannedStart: "",
  plannedEnd: "",
  priority: 1,
  status: 0,
  shiftCode: "",
  isActive: true,
});

export default function ProductionOrdersTable() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [productionLines, setProductionLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("orderName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState(createDefaultFormData());

  useEffect(() => {
    fetchProductionLines();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize, debouncedSearch, lineFilter, statusFilter, activeFilter, sortBy, sortDirection]);

  const fetchProductionLines = async () => {
    try {
      const data = await productionLineService.getAll();
      setProductionLines(data || []);
    } catch {
      // non-critical
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await productionOrderService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        productionLineID: lineFilter ? Number(lineFilter) : undefined,
        status: statusFilter !== "" ? Number(statusFilter) : undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setOrders(data?.items || []);
      setTotalCount(data?.totalCount || 0);
      if (data?.totalPages && page > data.totalPages) setPage(data.totalPages);
    } catch (error) {
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDERS, "production orders")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
        productionLineID: Number(formData.productionLineID),
        targetQuantity: formData.targetQuantity !== "" ? Number(formData.targetQuantity) : null,
        priority: Number(formData.priority),
        status: Number(formData.status),
        plannedStart: formData.plannedStart || null,
        plannedEnd: formData.plannedEnd || null,
      };

      if (editingId) {
        await productionOrderService.update(editingId, dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production order")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await productionOrderService.create(dataToSend);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production order")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(createDefaultFormData());
      fetchOrders();
    } catch (error) {
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "production order")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (order) => {
    setFormData({
      productionLineID: String(order.productionLineID || ""),
      orderCode: order.orderCode || "",
      orderName: order.orderName || "",
      description: order.description || "",
      batchNumber: order.batchNumber || "",
      lotNumber: order.lotNumber || "",
      targetQuantity: order.targetQuantity != null ? String(order.targetQuantity) : "",
      plannedStart: order.plannedStart ? order.plannedStart.substring(0, 16) : "",
      plannedEnd: order.plannedEnd ? order.plannedEnd.substring(0, 16) : "",
      priority: order.priority ?? 1,
      status: order.status ?? 0,
      shiftCode: order.shiftCode || "",
      isActive: order.isActive,
    });
    setEditingId(order.productionOrderID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_PRODUCTION_ORDER, "Are you sure you want to delete this production order?"))) {
      try {
        await productionOrderService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production order")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchOrders();
      } catch (error) {
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "production order")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await productionOrderService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDERS, "production orders")}`);
      fetchOrders();
    } catch (err) {
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDERS, "production orders")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const getStatusLabel = (status) => STATUS_OPTIONS.find((s) => s.value === status)?.label ?? String(status);
  const getPriorityLabel = (priority) => PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? String(priority);
  const getLineName = (lineId) => productionLines.find((l) => l.productionLineID === lineId)?.lineName ?? String(lineId);

  const columns = [
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER_NAME, "Order Name"),
      accessor: "orderName",
      sortKey: "orderName",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER_CODE, "Order Code"),
      accessor: "orderCode",
      sortKey: "orderCode",
      render: (row) =>
        renderEntityPill({
          type: "production-order",
          id: row.productionOrderID,
          label: row.orderCode || row.orderName || String(row.productionOrderID),
          fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
        }),
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line"),
      accessor: (row) => getLineName(row.productionLineID),
      sortKey: "productionLineID",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_ORDER_PRIORITY, "Priority"),
      accessor: (row) => getPriorityLabel(row.priority),
      sortKey: "priority",
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
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production Order")}`}
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
        data={orders}
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
        idField="productionOrderID"
        onBulkDelete={handleBulkDelete}
      />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setFormData(createDefaultFormData()); }}
        title={editingId
          ? `${t(K.ADMIN_TABLE_UPDATE, "Update")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production Order")}`
          : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_PRODUCTION_ORDER, "Production Order")}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")} *`}
            </label>
            <select
              name="productionLineID"
              value={formData.productionLineID}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">{t(K.ADMIN_TABLE_SELECT_PRODUCTION_LINE, "Select Production Line")}</option>
              {productionLines.map((l) => (
                <option key={l.productionLineID} value={l.productionLineID}>{l.lineName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {`${t(K.ADMIN_TABLE_PRODUCTION_ORDER_NAME, "Order Name")} *`}
            </label>
            <input
              type="text"
              name="orderName"
              value={formData.orderName}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={t(K.ADMIN_TABLE_ENTER_PRODUCTION_ORDER_NAME, "Enter order name")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_PRODUCTION_ORDER_CODE, "Order Code")}
            </label>
            <input
              type="text"
              name="orderCode"
              value={formData.orderCode}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={!editingId ? t(K.ADMIN_TABLE_LEAVE_EMPTY_AUTO_GENERATION, "Leave empty for auto-generation") : t(K.ADMIN_TABLE_ENTER_PRODUCTION_ORDER_CODE, "Enter order code (e.g., ORD-001)")}
            />
            {!editingId && (
              <p className="mt-1 text-xs text-gray-500">{t(K.ADMIN_TABLE_AUTO_CODE_EXAMPLE, "If empty, code will be auto-generated (e.g., ORD-000001)")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_BATCH_NUMBER, "Batch Number")}
              </label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="BATCH-001"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_LOT_NUMBER, "Lot Number")}
              </label>
              <input
                type="text"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="LOT-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_TARGET_QUANTITY, "Target Quantity")}
              </label>
              <input
                type="number"
                name="targetQuantity"
                value={formData.targetQuantity}
                onChange={handleInputChange}
                min="0"
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_SHIFT_CODE, "Shift Code")}
              </label>
              <input
                type="text"
                name="shiftCode"
                value={formData.shiftCode}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="SHIFT-A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_ORDER_PRIORITY, "Priority")}
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
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
              id="orderIsActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="orderIsActive" className="text-sm font-medium text-navy-700 dark:text-white">
              {t(K.ADMIN_TABLE_ACTIVE, "Active")}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditingId(null); setFormData(createDefaultFormData()); }}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
            </button>
            <button
              type="submit"
              className="rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
            >
              {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
