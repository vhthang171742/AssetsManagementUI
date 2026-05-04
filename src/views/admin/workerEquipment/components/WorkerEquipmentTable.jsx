import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { workerEquipmentService, userService, roomService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";

export default function WorkerEquipmentTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [assignments, setAssignments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("workerName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    workerID: "",
    roomAssetID: "",
    assignedDate: new Date().toISOString().split("T")[0],
    unassignedDate: "",
  });

  useEffect(() => {
    fetchWorkers();
    fetchEquipment();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchAssignments();
  }, [page, pageSize, debouncedSearch, statusFilter, sortBy, sortDirection]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await workerEquipmentService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        isActive: statusFilter === "" ? undefined : statusFilter === "active",
      });
      setAssignments(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const data = await userService.getAllUsers();
      // Backend assignment expects WorkerID (role entity), not UserID.
      const workerList =
        data?.filter((u) => u.roles?.includes("Worker") && u.workerRole?.workerID) || [];
      setWorkers(workerList);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      // Get all room assets (equipment)
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
        workerID: Number(formData.workerID),
        roomAssetID: Number(formData.roomAssetID),
        currentAssignmentID: editingId || null,
      };
      try {
        const validation = await workerEquipmentService.validateReferences(validationPayload);
        if (!validation?.isValid) {
          const details = validation?.errors?.length
            ? "\n• " + validation.errors.join("\n• ")
            : "\n• Please refresh and select valid Worker and Equipment values.";
          toast.error(t(K.ADMIN_TABLE_REFERENCE_VALIDATION_ERRORS, "Cannot save assignment due to reference validation errors:") + details);
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
        await workerEquipmentService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await workerEquipmentService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        workerID: "",
        roomAssetID: "",
        assignedDate: new Date().toISOString().split("T")[0],
        unassignedDate: "",
      });
      fetchAssignments();
    } catch (error) {
      console.error("Failed to save assignment:", error);
      const details = Array.isArray(error.errors) && error.errors.length
        ? "\n• " + error.errors.join("\n• ")
        : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}${details}`);
    }
  };

  const handleEdit = (assignment) => {
    setFormData({
      workerID: assignment.workerID,
      roomAssetID: assignment.roomAssetID,
      assignedDate: assignment.assignedDate?.split("T")[0],
      unassignedDate: assignment.unassignedDate?.split("T")[0] || "",
    });
    setEditingId(assignment.assignmentID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_ASSIGNMENT, "Are you sure you want to delete this assignment?"))) {
      try {
        await workerEquipmentService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchAssignments();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "assignment")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await workerEquipmentService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}`);
      fetchAssignments();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_ASSIGNMENTS, "assignments")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const columns = [
    {
      header: t(K.ADMIN_TABLE_WORKER, "Worker"),
      accessor: (row) =>
      workers.find((w) => w.workerRole?.workerID === row.workerID)?.fullName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "workerName",
    },
    {
      header: t(K.ADMIN_TABLE_EQUIPMENT, "Equipment"),
      accessor: (row) =>
        equipment.find((e) => e.roomAssetID === row.roomAssetID)?.assetName || t(K.ADMIN_TABLE_NA, "N/A"),
      sortKey: "assetName",
    },
    {
      header: t(K.ADMIN_TABLE_ASSIGNED_DATE, "Assigned Date"),
      accessor: (row) => formatDateInTimeZone(row.assignedDate, userTimeZoneId),
      sortKey: "assignedDate",
    },
    {
      header: t(K.ADMIN_TABLE_UNASSIGNED_DATE, "Unassigned Date"),
      accessor: (row) =>
        row.unassignedDate ? formatDateInTimeZone(row.unassignedDate, userTimeZoneId) : "—",
      sortKey: "unassignedDate",
    },
    {
      header: t(K.ADMIN_TABLE_STATUS, "Status"),
      accessor: (row) => (row.unassignedDate ? t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned") : t(K.ADMIN_TABLE_ACTIVE, "Active")),
      sortKey: "isActive",
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
            onClick={() => handleDelete(row.assignmentID)}
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
              workerID: "",
              roomAssetID: "",
              assignedDate: new Date().toISOString().split("T")[0],
              unassignedDate: "",
            });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_ASSIGNMENT, "Assignment")}`}
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            <option value="active">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</option>
            <option value="unassigned">{t(K.ADMIN_TABLE_UNASSIGNED, "Unassigned")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          columns={columns}
          data={assignments}
          onBulkDelete={handleBulkDelete}
          idField="assignmentID"
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
          title={
            editingId
              ? t(K.ADMIN_TABLE_EDIT_WORKER_EQUIPMENT_ASSIGNMENT, "Edit Worker Equipment Assignment")
              : t(K.ADMIN_TABLE_ADD_WORKER_EQUIPMENT_ASSIGNMENT, "Add Worker Equipment Assignment")
          }
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
                form="worker-equipment-form"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="worker-equipment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                {t(K.ADMIN_TABLE_ASSIGNED_DATE, "Assigned Date")}
              </label>
              <input
                type="date"
                name="assignedDate"
                value={formData.assignedDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 text-sm font-medium text-gray-700 dark:text-white">
                {t(K.ADMIN_TABLE_UNASSIGNED_DATE_OPTIONAL, "Unassigned Date (Optional)")}
              </label>
              <input
                type="date"
                name="unassignedDate"
                value={formData.unassignedDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

