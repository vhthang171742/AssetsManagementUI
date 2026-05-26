import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { productionLineService, departmentService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import TableFilterModal from "components/table/TableFilterModal";
import { renderEntityPill, renderLookupEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete, MdAdd } from "react-icons/md";
import { QRCodeSVG } from "qrcode.react";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function ProductionLinesTable() {
  const { t } = useLanguage();
  const [lines, setLines] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrAsset, setSelectedQrAsset] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [managingLine, setManagingLine] = useState(null);
  const [lineAssets, setLineAssets] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("lineName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    departmentID: "",
    lineName: "",
    lineCode: "",
    orderCode: "",
    capacity: "",
    isActive: true,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchProductionLines();
  }, [page, pageSize, debouncedSearch, activeFilters, sortBy, sortDirection]);

  const fetchProductionLines = async () => {
    try {
      setLoading(true);
      const data = await productionLineService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        departmentID: activeFilters["departmentID"]?.[0] ? Number(activeFilters["departmentID"][0]) : undefined,
        isActive: activeFilters["isActive"]?.[0] === undefined ? undefined : activeFilters["isActive"][0] === "true",
      });
      setLines(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
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

  const fetchLineAssets = async (lineId) => {
    try {
      const data = await productionLineService.getAssets(lineId);
      setLineAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch production line assets:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_ROOM_ASSETS, "room assets")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      setLineAssets([]);
    }
  };

  const openAssetsModal = async (line) => {
    setManagingLine(line);
    setShowAssetsModal(true);
    await fetchLineAssets(line.productionLineID);
  };

  const handleRemoveLineAsset = async (assignmentId) => {
    if (!managingLine?.productionLineID) {
      return;
    }

    if (!window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_ASSIGNMENT, "Are you sure you want to delete this assignment?"))) {
      return;
    }

    try {
      await productionLineService.removeAsset(managingLine.productionLineID, assignmentId);
      toast.success(`${t(K.ADMIN_TABLE_ASSET, "Asset")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
      await fetchLineAssets(managingLine.productionLineID);
    } catch (error) {
      console.error("Failed to remove production line asset:", error);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ASSET, "asset")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
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
      sortKey: "lineName",
    },
    {
      header: t(K.ADMIN_TABLE_LINE_CODE, "Line Code"),
      accessor: "lineCode",
      sortKey: "lineCode",
      render: (row) => renderEntityPill({
        type: "productionLine",
        id: row.productionLineID,
        label: row.lineCode || row.lineName || t(K.ADMIN_TABLE_NA, "N/A"),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_DEPARTMENT, "Department"),
      accessor: (row) =>
        departments.find((d) => d.departmentID === row.departmentID)
          ?.departmentName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "departmentName",
      render: (row) => renderLookupEntityPill({
        type: "department",
        id: row.departmentID,
        items: departments,
        idField: "departmentID",
        labelResolver: (dept) => dept?.departmentCode || dept?.departmentName || t(K.ADMIN_TABLE_NA, "N/A"),
        fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
      }),
    },
    {
      header: t(K.ADMIN_TABLE_ORDER_CODE, "Order Code"),
      accessor: "orderCode",
      sortKey: "orderCode",
    },
    {
      header: t(K.ADMIN_TABLE_CAPACITY, "Capacity"),
      accessor: "capacity",
      sortKey: "capacity",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")),
      sortKey: "isActive",
    },
    {
      header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
      isActions: true,
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openAssetsModal(row)}
            className="inline-flex min-w-[110px] items-center justify-center rounded-md border border-teal-300 bg-teal-500 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-600"
            title={t(K.ADMIN_TABLE_WORKING_ASSETS, "Working Assets")}
          >
            {t(K.ADMIN_TABLE_WORKING_ASSETS, "Working Assets")}
          </button>
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

  const filterableColumns = [
    { key: "departmentID", label: t(K.ADMIN_TABLE_DEPARTMENT, "Department"), options: departments.map((d) => ({ value: String(d.departmentID), label: d.departmentName })) },
    {
      key: "isActive",
      label: t(K.ADMIN_TABLE_STATUS, "Status"),
      options: [
        { value: "true", label: t(K.ADMIN_TABLE_ACTIVE, "Active") },
        { value: "false", label: t(K.ADMIN_TABLE_INACTIVE, "Inactive") },
      ],
    },
  ];

  const handleFilterApply = (newFilters) => { setActiveFilters(newFilters); setPage(1); };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center gap-3">
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
          className="shrink-0 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}`}
        </button>
        <TableFilterModal filterableColumns={filterableColumns} activeFilters={activeFilters} onFilterApply={handleFilterApply} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_CODE, "Search name, code")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          columns={columns}
          data={lines}
          onBulkDelete={handleBulkDelete}
          serverPagination
          page={page}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(key, direction) => {
            setSortBy(key);
            setSortDirection(direction);
            setPage(1);
          }}
          filterableColumns={filterableColumns}
          activeFilters={activeFilters}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={!editingId ? t(K.ADMIN_TABLE_LEAVE_EMPTY_AUTO_GENERATION, "Leave empty for auto-generation") : t(K.ADMIN_TABLE_ENTER_LINE_CODE, "Enter line code")}
              />
              {!editingId && (
                <p className="mt-1 text-xs text-gray-500">{t(K.ADMIN_TABLE_AUTO_CODE_EXAMPLE, "If empty, code will be auto-generated (e.g., LINE-00001)")}</p>
              )}
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

      {showAssetsModal && (
        <Modal
          isOpen={showAssetsModal}
          onClose={() => {
            setShowAssetsModal(false);
            setManagingLine(null);
            setLineAssets([]);
          }}
          title={`${t(K.ADMIN_TABLE_WORKING_ASSETS, "Working Assets")} - ${managingLine?.lineName || ""}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowAssetsModal(false);
                  setManagingLine(null);
                  setLineAssets([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Close")}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="rounded border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}: {managingLine?.lineName || ""}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {t(K.ADMIN_TABLE_LINE_CODE, "Line Code")}: {managingLine?.lineCode || ""}
              </p>
            </div>

            <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              {t(K.ADMIN_TABLE_WORKING_ASSET_CREATION_HANDOVER_ONLY, "Working asset creation is now available only in Handovers. Please create new production line assets from the Handovers screen.")}
            </div>

            <div className="max-h-72 overflow-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">{t(K.ADMIN_TABLE_ASSET, "Asset")}</th>
                    <th className="px-3 py-2 text-left">{t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number")}</th>
                    <th className="px-3 py-2 text-left">{t(K.ADMIN_TABLE_ROOM, "Room")}</th>
                    <th className="px-3 py-2 text-left">{t(K.ADMIN_TABLE_ACTIONS, "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineAssets.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-300" colSpan={4}>
                        {t(K.TABLE_NO_DATA, "No data")}
                      </td>
                    </tr>
                  ) : (
                    lineAssets.map((asset) => (
                      <tr key={asset.assignmentID} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2">{asset.assetName || t(K.ADMIN_TABLE_NA, "N/A")}</td>
                        <td className="px-3 py-2">{asset.serialNumber || t(K.ADMIN_TABLE_NA, "N/A")}</td>
                        <td className="px-3 py-2">{asset.roomName || t(K.ADMIN_TABLE_NA, "N/A")}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {asset.qrCodeValue ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedQrAsset(asset);
                                  setShowQrModal(true);
                                }}
                                className="rounded-md border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                                title={t(K.ADMIN_TABLE_VIEW_QR, "View QR")}
                              >
                                {t(K.ADMIN_TABLE_VIEW_QR, "View QR")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleRemoveLineAsset(asset.assignmentID)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title={t(K.ADMIN_TABLE_DELETE, "Delete")}
                            >
                              <MdDelete className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {showQrModal && selectedQrAsset && (
        <Modal
          isOpen={showQrModal}
          onClose={() => {
            setShowQrModal(false);
            setSelectedQrAsset(null);
          }}
          title={t(K.ADMIN_TABLE_ASSET_QR_CODE, "Asset QR Code")}
          maxWidth={"max-w-md"}
          footer={
            <>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setSelectedQrAsset(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center gap-3 py-2">
            <QRCodeSVG value={selectedQrAsset.qrCodeValue} size={280} level="M" includeMargin={true} />
            <p className="text-sm font-semibold text-navy-700 dark:text-white">{selectedQrAsset.assetName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">{`${t(K.ADMIN_TABLE_SERIAL, "Serial")}: ${selectedQrAsset.serialNumber}`}</p>
            <p className="max-w-full break-all text-center font-mono text-[11px] text-gray-500 dark:text-gray-300">
              {selectedQrAsset.qrCodeValue}
            </p>
          </div>
        </Modal>
      )}
    </Card>
  );
}

