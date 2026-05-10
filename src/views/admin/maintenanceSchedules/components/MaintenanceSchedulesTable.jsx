import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { maintenanceScheduleService, assetService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import { renderLookupEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";

export default function MaintenanceSchedulesTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [schedules, setSchedules] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [assets, setAssets] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("scheduleID");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    assetID: "",
    maintenanceTypeItemID: "",
    frequency: "",
    description: "",
    lastMaintenanceDate: "",
    nextDueDate: "",
    isActive: true,
  });

  useEffect(() => {
    fetchAssets();
    fetchMaintenanceTypes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchSchedules();
  }, [page, pageSize, debouncedSearch, assetFilter, typeFilter, activeFilter, sortBy, sortDirection]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await maintenanceScheduleService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        assetID: assetFilter ? Number(assetFilter) : undefined,
        maintenanceTypeItemID: typeFilter ? Number(typeFilter) : undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setSchedules(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_MAINTENANCE_SCHEDULES, "maintenance schedules")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
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

  const fetchMaintenanceTypes = async () => {
    try {
      const data = await dropdownService.getMaintenanceTypes();
      setMaintenanceTypes(data || []);
    } catch (error) {
      console.error("Failed to fetch maintenance types:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "frequency" ? parseInt(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await maintenanceScheduleService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await maintenanceScheduleService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error("Failed to save schedule:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_SCHEDULE, "schedule")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (schedule) => {
    setFormData({
      assetID: schedule.assetID,
      maintenanceTypeItemID: schedule.maintenanceTypeItemID,
      frequency: schedule.frequency,
      description: schedule.description || "",
      lastMaintenanceDate: schedule.lastMaintenanceDate ? schedule.lastMaintenanceDate.substring(0, 16) : "",
      nextDueDate: schedule.nextDueDate ? schedule.nextDueDate.substring(0, 16) : "",
      isActive: schedule.isActive,
    });
    setEditingId(schedule.scheduleID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_SCHEDULE, "Are you sure you want to delete this schedule?"))) {
      try {
        await maintenanceScheduleService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_SCHEDULE, "Schedule")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchSchedules();
      } catch (error) {
        console.error("Failed to delete schedule:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_SCHEDULE, "schedule")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await maintenanceScheduleService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_SCHEDULES, "schedules")}`);
      fetchSchedules();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_SCHEDULES, "schedules")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      assetID: "",
      maintenanceTypeItemID: "",
      frequency: "",
      description: "",
      lastMaintenanceDate: "",
      nextDueDate: "",
      isActive: true,
    });
  };

  const getAssetName = (assetID) => {
    const asset = assets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const getMaintenanceTypeName = (itemID) => {
    const type = maintenanceTypes.find((t) => t.itemID === itemID);
    return type ? type.label : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {t(K.ADMIN_TABLE_ADD_MAINTENANCE_SCHEDULE, "Add Maintenance Schedule")}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-3xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_ASSET_DESCRIPTION, "Search asset, description")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={assetFilter}
            onChange={(e) => {
              setAssetFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ROUTE_ASSETS, "Assets")}`}</option>
            {assets.map((a) => (
              <option key={a.assetID} value={a.assetID}>{a.assetName}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_TYPES, "Types")}`}</option>
            {maintenanceTypes.map((t) => (
              <option key={t.itemID} value={t.itemID}>{t.label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            <option value="true">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</option>
            <option value="false">{t(K.ADMIN_TABLE_INACTIVE, "Inactive")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          data={schedules}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="scheduleID"
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
          columns={[
            {
              header: t(K.ADMIN_TABLE_ASSET, 'Asset'),
              accessor: 'assetID',
              sortKey: "assetName",
              render: (row) => renderLookupEntityPill({
                type: "asset",
                id: row.assetID,
                items: assets,
                idField: "assetID",
                labelResolver: (asset) => asset?.assetCode || asset?.assetName || getAssetName(row.assetID),
                fallbackLabel: t(K.ADMIN_TABLE_NA, 'N/A'),
              }),
            },
            { header: t(K.ADMIN_TABLE_TYPE, 'Type'), accessor: 'maintenanceTypeItemID', sortKey: "maintenanceType", render: (row) => getMaintenanceTypeName(row.maintenanceTypeItemID) },
            { header: t(K.ADMIN_TABLE_FREQUENCY, 'Frequency'), accessor: 'frequency', sortKey: "frequency", render: (row) => t(K.ADMIN_TABLE_FREQUENCY_DAYS_HOURS, `${row.frequency} days/hours`).replace("{value}", row.frequency) },
            { header: t(K.ADMIN_TABLE_LAST_MAINTENANCE, 'Last Maintenance'), accessor: 'lastMaintenanceDate', sortKey: "lastMaintenanceDate", render: (row) => row.lastMaintenanceDate ? formatDateInTimeZone(row.lastMaintenanceDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, 'N/A') },
            { header: t(K.ADMIN_TABLE_NEXT_DUE, 'Next Due'), accessor: 'nextDueDate', sortKey: "nextDueDate", render: (row) => row.nextDueDate ? formatDateInTimeZone(row.nextDueDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, 'N/A') },
            { header: t(K.ADMIN_TABLE_ACTIVE, 'Active'), accessor: 'isActive', sortKey: "isActive", render: (row) => row.isActive ? '\u2713' : '\u2717' },
            {
              header: t(K.ADMIN_TABLE_ACTIONS, 'Actions'),
              isActions: true,
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
                    onClick={() => handleDelete(row.scheduleID)}
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

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? t(K.ADMIN_TABLE_EDIT_MAINTENANCE_SCHEDULE, "Edit Maintenance Schedule") : t(K.ADMIN_TABLE_ADD_NEW_MAINTENANCE_SCHEDULE, "Add New Maintenance Schedule")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="scheduleForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="scheduleForm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select
                name="assetID"
                value={formData.assetID}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_ASSET, "Select Asset")}</option>
                {assets.map((asset) => (
                  <option key={asset.assetID} value={asset.assetID}>
                    {asset.assetName} ({asset.assetCode})
                  </option>
                ))}
              </select>

              <select
                name="maintenanceTypeItemID"
                value={formData.maintenanceTypeItemID}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_MAINTENANCE_TYPE, "Select Maintenance Type")}</option>
                {maintenanceTypes.map((type) => (
                  <option key={type.itemID} value={type.itemID}>
                    {type.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="frequency"
                placeholder={t(K.ADMIN_TABLE_FREQUENCY_DAYS_OR_HOURS, "Frequency (days or hours)")}
                value={formData.frequency}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <textarea
                name="description"
                placeholder={t(K.ADMIN_TABLE_DESCRIPTION, "Description")}
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="3"
              />

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_LAST_MAINTENANCE_DATE, "Last Maintenance Date")}</label>
                <input
                  type="datetime-local"
                  name="lastMaintenanceDate"
                  value={formData.lastMaintenanceDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_NEXT_DUE_DATE, "Next Due Date")}</label>
                <input
                  type="datetime-local"
                  name="nextDueDate"
                  value={formData.nextDueDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                  id="isActive"
                />
                <label htmlFor="isActive" className="dark:text-white">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</label>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

