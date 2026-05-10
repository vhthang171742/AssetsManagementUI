import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { equipmentUsageService, userService, roomService, productionLineService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { renderEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateTimeInTimeZone } from "services/dateTimeService";

export default function EquipmentUsageTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [usageLogs, setUsageLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("startTime");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    roomAssetID: "",
    workerID: "",
    productionLineID: "",
    startTime: new Date().toISOString(),
    endTime: "",
    runningMinutes: "",
    downtimeMinutes: "",
    stitchCount: "",
    notes: "",
  });

  useEffect(() => {
    fetchWorkers();
    fetchEquipment();
    fetchLines();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchUsageLogs();
  }, [page, pageSize, debouncedSearch, lineFilter, sortBy, sortDirection]);

  const fetchUsageLogs = async () => {
    try {
      setLoading(true);
      const data = await equipmentUsageService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        productionLineID: lineFilter ? Number(lineFilter) : undefined,
      });
      setUsageLogs(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch usage logs:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_USAGE_LOGS, "usage logs")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await userService.getAllUsers();
      const workerList =
        data?.filter((u) => u.roles?.includes("Worker") && u.workerRole?.workerID) || [];
      setWorkers(workerList);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const rooms = await roomService.getAll();
      let allAssets = [];
      for (const room of rooms) {
        const assets = await roomService.getAssets(room.roomID);
        allAssets = [...allAssets, ...assets];
      }
      setEquipment(allAssets || []);
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
    }
  };

  const fetchLines = async () => {
    try {
      const data = await productionLineService.getAll();
      setLines(data || []);
    } catch (error) {
      console.error("Failed to fetch production lines:", error);
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
      const validationPayload = {
        roomAssetID: Number(formData.roomAssetID),
        workerID: Number(formData.workerID),
        productionLineID: Number(formData.productionLineID),
      };
      try {
        const validation = await equipmentUsageService.validateReferences(validationPayload);
        if (!validation?.isValid) {
          const details = validation?.errors?.length
            ? "\n• " + validation.errors.join("\n• ")
            : "\n• Please refresh and select valid Equipment, Worker, and Production Line values.";
          toast.error(t(K.ADMIN_TABLE_REFERENCE_VALIDATION_ERRORS_USAGE_LOG, "Cannot save usage log due to reference validation errors:") + details);
          return;
        }
      } catch (validationError) {
        if (![404, 405].includes(validationError?.statusCode)) {
          throw validationError;
        }
        // Backward compatibility: continue submit if API hasn't deployed validation endpoint yet.
        console.warn("Validation endpoint unavailable, continuing with create/update request.");
      }

      if (editingId) {
        await equipmentUsageService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_USAGE_LOG, "Usage log")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await equipmentUsageService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_USAGE_LOG, "Usage log")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        roomAssetID: "",
        workerID: "",
        productionLineID: "",
        startTime: new Date().toISOString(),
        endTime: "",
        runningMinutes: "",
        downtimeMinutes: "",
        stitchCount: "",
        notes: "",
      });
      fetchUsageLogs();
    } catch (error) {
      console.error("Failed to save usage log:", error);
      const details = Array.isArray(error.errors) && error.errors.length
        ? "\n• " + error.errors.join("\n• ")
        : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_USAGE_LOG, "usage log")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}${details}`);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      roomAssetID: log.roomAssetID,
      workerID: log.workerID,
      productionLineID: log.productionLineID,
      startTime: log.startTime,
      endTime: log.endTime || "",
      runningMinutes: log.runningMinutes || "",
      downtimeMinutes: log.downtimeMinutes || "",
      stitchCount: log.stitchCount || "",
      notes: log.notes || "",
    });
    setEditingId(log.usageLogID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_USAGE_LOG, "Are you sure you want to delete this usage log?"))) {
      try {
        await equipmentUsageService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_USAGE_LOG, "Usage log")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchUsageLogs();
      } catch (error) {
        console.error("Failed to delete usage log:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_USAGE_LOG, "usage log")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await equipmentUsageService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_USAGE_LOGS, "usage logs")}`);
      fetchUsageLogs();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_USAGE_LOGS, "usage logs")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_EQUIPMENT, "Equipment"),
      accessor: (row) =>
        equipment.find((e) => e.roomAssetID === row.roomAssetID)?.assetName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "assetName",
      render: (row) => {
        const item = equipment.find((e) => e.roomAssetID === row.roomAssetID);
        const assetId = row.assetID || item?.assetID;
        return renderEntityPill({
          type: "asset",
          id: assetId,
          label: row.assetCode || item?.assetCode || row.assetName || item?.assetName || t(K.ADMIN_TABLE_NA, "N/A"),
          fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
          modalData: {
            serialNumber: row.serialNumber || item?.serialNumber || null,
          },
        });
      },
    },
    {
      header: t(K.ADMIN_TABLE_WORKER, "Worker"),
      accessor: (row) =>
      workers.find((w) => w.workerRole?.workerID === row.workerID)?.fullName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "workerName",
    },
    {
      header: t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line"),
      accessor: (row) =>
        lines.find((l) => l.productionLineID === row.productionLineID)?.lineName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "productionLineName",
      render: (row) => {
        const line = lines.find((l) => l.productionLineID === row.productionLineID);
        return renderEntityPill({
          type: "productionLine",
          id: row.productionLineID,
          label: line?.lineCode || line?.lineName || row.productionLineName || t(K.ADMIN_TABLE_NA, "N/A"),
          fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
        });
      },
    },
    {
      header: t(K.ADMIN_TABLE_START_TIME, "Start Time"),
      accessor: (row) => formatDateTimeInTimeZone(row.startTime, userTimeZoneId, { dateStyle: "short", timeStyle: "short" }),
      sortKey: "startTime",
    },
    {
      header: t(K.ADMIN_TABLE_END_TIME, "End Time"),
      accessor: (row) =>
        row.endTime ? formatDateTimeInTimeZone(row.endTime, userTimeZoneId, { dateStyle: "short", timeStyle: "short" }) : "—",
      sortKey: "endTime",
    },
    {
      header: t(K.ADMIN_TABLE_RUNNING_MINUTES, "Running Minutes"),
      accessor: "runningMinutes",
      sortKey: "runningMinutes",
    },
    {
      header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
      isActions: true,
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
            onClick={() => handleDelete(row.usageLogID)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title={t(K.ADMIN_TABLE_DELETE, "Delete")}
          >
            <MdDelete className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setFormData({
              roomAssetID: "",
              workerID: "",
              productionLineID: "",
              startTime: new Date().toISOString(),
              endTime: "",
              runningMinutes: "",
              downtimeMinutes: "",
              stitchCount: "",
              notes: "",
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {t(K.ADMIN_TABLE_LOG_EQUIPMENT_USAGE, "Log Equipment Usage")}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-lg">
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_WORKER_EQUIPMENT, "Search worker, equipment")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={lineFilter}
            onChange={(e) => {
              setLineFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_PRODUCTION_LINES, "Production Lines")}`}</option>
            {lines.map((l) => (
              <option key={l.productionLineID} value={l.productionLineID}>{l.lineName}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          columns={columns}
          data={usageLogs}
          onBulkDelete={handleBulkDelete}
          idField="usageLogID"
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
        />
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
          }}
          title={editingId ? t(K.ADMIN_TABLE_EDIT_USAGE_LOG, "Edit Usage Log") : t(K.ADMIN_TABLE_LOG_EQUIPMENT_USAGE, "Log Equipment Usage")}
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
                form="equipment-usage-form"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_LOG_USAGE, "Log Usage")}
              </button>
            </>
          }
        >
          <form id="equipment-usage-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_EQUIPMENT, "Equipment")}
              </label>
              <select
                name="roomAssetID"
                value={formData.roomAssetID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_EQUIPMENT, "Select Equipment")}</option>
                {equipment.map((item) => (
                  <option key={item.roomAssetID} value={item.roomAssetID}>
                    {item.assetName} ({item.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_WORKER, "Worker")}
              </label>
              <select
                name="workerID"
                value={formData.workerID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_WORKER, "Select Worker")}</option>
                {workers.map((worker) => (
                  <option key={worker.userID} value={worker.workerRole.workerID}>
                    {worker.fullName || worker.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}
              </label>
              <select
                name="productionLineID"
                value={formData.productionLineID}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_PRODUCTION_LINE, "Select Production Line")}</option>
                {lines.map((line) => (
                  <option key={line.productionLineID} value={line.productionLineID}>
                    {line.lineName} ({line.lineCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_START_TIME, "Start Time")}
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime.slice(0, 16)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: new Date(e.target.value).toISOString(),
                  }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_END_TIME_OPTIONAL, "End Time (Optional)")}
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime ? formData.endTime.slice(0, 16) : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_RUNNING_MINUTES, "Running Minutes")}
              </label>
              <input
                type="number"
                name="runningMinutes"
                value={formData.runningMinutes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_RUNNING_MINUTES_EXAMPLE, "e.g., 480")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_DOWNTIME_MINUTES, "Downtime Minutes")}
              </label>
              <input
                type="number"
                name="downtimeMinutes"
                value={formData.downtimeMinutes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_DOWNTIME_MINUTES_EXAMPLE, "e.g., 30")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_STITCH_COUNT_OPTIONAL, "Stitch Count (Optional)")}
              </label>
              <input
                type="number"
                name="stitchCount"
                value={formData.stitchCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_STITCH_COUNT_EXAMPLE, "e.g., 5000")}
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_NOTES, "Notes")}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t(K.ADMIN_TABLE_ADD_NOTES_USAGE, "Add any notes about the usage")}
                rows="3"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

