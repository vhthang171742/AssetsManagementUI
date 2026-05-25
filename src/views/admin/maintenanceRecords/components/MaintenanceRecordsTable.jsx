import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { maintenanceRecordService, assetService, userService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import TableFilterModal from "components/table/TableFilterModal";
import { renderLookupEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";

export default function MaintenanceRecordsTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [assets, setAssets] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [failureCategories, setFailureCategories] = useState([]);
  const [completionStatuses, setCompletionStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("maintenanceDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    assetID: "",
    scheduleID: null,
    maintenanceTypeItemID: "",
    maintenanceDate: "",
    technicianID: "",
    failureCategoryItemID: "",
    rootCause: "",
    repairDurationMinutes: "",
    completionStatusItemID: "",
    notes: "",
  });

  useEffect(() => {
    fetchAssets();
    fetchMaintenanceTypes();
    fetchTechnicians();
    fetchFailureCategories();
    fetchCompletionStatuses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchRecords();
  }, [page, pageSize, debouncedSearch, activeFilters, sortBy, sortDirection]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await maintenanceRecordService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        assetID: activeFilters.assetID?.length ? Number(activeFilters.assetID[0]) : undefined,
        maintenanceTypeItemID: activeFilters.maintenanceTypeItemID?.length ? Number(activeFilters.maintenanceTypeItemID[0]) : undefined,
        completionStatusItemID: activeFilters.completionStatusItemID?.length ? Number(activeFilters.completionStatusItemID[0]) : undefined,
      });
      setRecords(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_MAINTENANCE_RECORDS, "maintenance records")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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

  const fetchTechnicians = async () => {
    try {
      const data = await userService.getAllUsers();
      const technicianList =
        data
          ?.filter((u) => u.roles?.includes("Technician") && u.technicianRole?.technicianID)
          .map((u) => ({
            technicianID: u.technicianRole.technicianID,
            fullName: u.fullName,
          })) || [];
      setTechnicians(technicianList);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
    }
  };

  const fetchFailureCategories = async () => {
    try {
      const data = await dropdownService.getFailureCategories();
      setFailureCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch failure categories:", error);
    }
  };

  const fetchCompletionStatuses = async () => {
    try {
      const data = await dropdownService.getCompletionStatuses();
      setCompletionStatuses(data || []);
    } catch (error) {
      console.error("Failed to fetch completion statuses:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "repairDurationMinutes" ? parseInt(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      // Convert empty strings to null for optional fields
      if (!payload.scheduleID) payload.scheduleID = null;
      if (!payload.technicianID) payload.technicianID = null;
      if (!payload.failureCategoryItemID) payload.failureCategoryItemID = null;
      if (!payload.completionStatusItemID) payload.completionStatusItemID = null;

      if (editingId) {
        await maintenanceRecordService.update(editingId, payload);
        toast.success(`${t(K.ADMIN_TABLE_RECORD, "Record")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await maintenanceRecordService.create(payload);
        toast.success(`${t(K.ADMIN_TABLE_RECORD, "Record")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error("Failed to save record:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_RECORD, "record")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (record) => {
    setFormData({
      assetID: record.assetID,
      scheduleID: record.scheduleID || "",
      maintenanceTypeItemID: record.maintenanceTypeItemID,
      maintenanceDate: record.maintenanceDate ? record.maintenanceDate.substring(0, 16) : "",
      technicianID: record.technicianID || "",
      failureCategoryItemID: record.failureCategoryItemID || "",
      rootCause: record.rootCause || "",
      repairDurationMinutes: record.repairDurationMinutes || "",
      completionStatusItemID: record.completionStatusItemID || "",
      notes: record.notes || "",
    });
    setEditingId(record.recordID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_RECORD, "Are you sure you want to delete this record?"))) {
      try {
        await maintenanceRecordService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_RECORD, "Record")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchRecords();
      } catch (error) {
        console.error("Failed to delete record:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_RECORD, "record")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await maintenanceRecordService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_RECORDS, "records")}`);
      fetchRecords();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_RECORDS, "records")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      assetID: "",
      scheduleID: null,
      maintenanceTypeItemID: "",
      maintenanceDate: "",
      technicianID: "",
      failureCategoryItemID: "",
      rootCause: "",
      repairDurationMinutes: "",
      completionStatusItemID: "",
      notes: "",
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

  const getTechnicianName = (technicianID) => {
    if (!technicianID) return t(K.ADMIN_TABLE_NA, "N/A");
    const tech = technicians.find((t) => t.technicianID === technicianID);
    return tech ? tech.fullName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const filterableColumns = [
    { key: "assetID", label: t(K.ADMIN_TABLE_ASSET, "Asset"), options: assets.map((a) => ({ value: String(a.assetID), label: a.assetName })) },
    { key: "maintenanceTypeItemID", label: t(K.ADMIN_TABLE_TYPE, "Type"), options: maintenanceTypes.map((mt) => ({ value: String(mt.itemID), label: mt.label })) },
    { key: "completionStatusItemID", label: t(K.ADMIN_TABLE_COMPLETION_STATUS, "Completion Status"), options: completionStatuses.map((s) => ({ value: String(s.itemID), label: s.label })) },
  ];

  const handleFilterApply = (newFilters) => { setActiveFilters(newFilters); setPage(1); };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
          className="shrink-0 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {t(K.ADMIN_TABLE_ADD_MAINTENANCE_RECORD, "Add Maintenance Record")}
        </button>
        <TableFilterModal filterableColumns={filterableColumns} activeFilters={activeFilters} onFilterApply={handleFilterApply} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          placeholder={t(K.ADMIN_TABLE_SEARCH_ASSET_TECHNICIAN_ROOT_CAUSE, "Search asset, technician, root cause")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          data={records}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="recordID"
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
            { header: t(K.ADMIN_TABLE_TYPE, 'Type'), accessor: 'maintenanceTypeItemID', sortKey: "maintenanceType", filterKey: "maintenanceTypeItemID", render: (row) => getMaintenanceTypeName(row.maintenanceTypeItemID) },
            { header: t(K.ADMIN_TABLE_DATE, 'Date'), accessor: 'maintenanceDate', sortKey: "maintenanceDate", render: (row) => formatDateInTimeZone(row.maintenanceDate, userTimeZoneId) },
            { header: t(K.ADMIN_TABLE_TECHNICIAN, 'Technician'), accessor: 'technicianID', sortKey: "technicianName", render: (row) => getTechnicianName(row.technicianID) },
            { header: t(K.ADMIN_TABLE_DURATION_MIN, 'Duration (min)'), accessor: 'repairDurationMinutes', sortKey: "repairDurationMinutes" },
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
                    onClick={() => handleDelete(row.recordID)}
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
          filterableColumns={filterableColumns}
          activeFilters={activeFilters}
        />
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? t(K.ADMIN_TABLE_EDIT_MAINTENANCE_RECORD, "Edit Maintenance Record") : t(K.ADMIN_TABLE_ADD_NEW_MAINTENANCE_RECORD, "Add New Maintenance Record")}
          maxWidth={"max-w-3xl"}
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
                form="recordForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="recordForm" onSubmit={handleSubmit}>
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
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_MAINTENANCE_TYPE, "Select Maintenance Type")}</option>
                {maintenanceTypes.map((type) => (
                  <option key={type.itemID} value={type.itemID}>
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_MAINTENANCE_DATE, "Maintenance Date")}</label>
                <input
                  type="datetime-local"
                  name="maintenanceDate"
                  value={formData.maintenanceDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <select
                name="technicianID"
                value={formData.technicianID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_TECHNICIAN_OPTIONAL, "Select Technician (Optional)")}</option>
                {technicians.map((tech) => (
                  <option key={tech.technicianID} value={tech.technicianID}>
                    {tech.fullName}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="repairDurationMinutes"
                placeholder={t(K.ADMIN_TABLE_REPAIR_DURATION_MINUTES, "Repair Duration (minutes)")}
                value={formData.repairDurationMinutes}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <select
                name="failureCategoryItemID"
                value={formData.failureCategoryItemID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_FAILURE_CATEGORY_OPTIONAL, "Select Failure Category (Optional)")}</option>
                {failureCategories.map((cat) => (
                  <option key={cat.itemID} value={cat.itemID}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                name="completionStatusItemID"
                value={formData.completionStatusItemID}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_COMPLETION_STATUS_OPTIONAL, "Select Completion Status (Optional)")}</option>
                {completionStatuses.map((status) => (
                  <option key={status.itemID} value={status.itemID}>
                    {status.label}
                  </option>
                ))}
              </select>

              <textarea
                name="rootCause"
                placeholder={t(K.ADMIN_TABLE_ROOT_CAUSE, "Root Cause")}
                value={formData.rootCause}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="2"
              />

              <textarea
                name="notes"
                placeholder={t(K.ADMIN_TABLE_NOTES, "Notes")}
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="2"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

