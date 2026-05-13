import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { roomService, departmentService, classService, studentEquipmentAssignmentService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Card from "components/card";
import Table from "components/table/Table";
import { renderEntityPill, renderLookupEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete, MdInventory2, MdRemoveCircle, MdInfoOutline } from "react-icons/md";
import Modal from "components/modal/Modal";
import RoomAssetIssueReporter from "components/roomAsset/RoomAssetIssueReporter";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function RoomsTable() {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [rooms, setRooms] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAssetDetailsModal, setShowAssetDetailsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedQrAsset, setSelectedQrAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
  const [assetAssignments, setAssetAssignments] = useState([]);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [operationalStatusOptions, setOperationalStatusOptions] = useState([]);
  const [editingAssetCondition, setEditingAssetCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [editingOperationalStatus, setEditingOperationalStatus] = useState(false);
  const [newOperationalStatus, setNewOperationalStatus] = useState("");
  const [editingAssetRoom, setEditingAssetRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isChangingAssetRoom, setIsChangingAssetRoom] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [newStudentId, setNewStudentId] = useState("");
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isUnassigningStudent, setIsUnassigningStudent] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("roomName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    departmentID: "",
    roomName: "",
    description: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchConditionOptions = async () => {
      try {
        const [conditions, operationalStatuses] = await Promise.all([
          dropdownService.getAssetConditions(language),
          dropdownService.getEquipmentStatus(language),
        ]);
        setConditionOptions(conditions || []);
        setOperationalStatusOptions(operationalStatuses || []);
      } catch (error) {
        console.error("Failed to fetch condition options:", error);
      }
    };

    fetchConditionOptions();
  }, [language]);

  const getConditionLabel = (code) => {
    if (!code) {
      return t(K.ADMIN_TABLE_NA, "N/A");
    }

    const match = (conditionOptions || []).find((item) => item.itemCode === code);
    return match?.label || code;
  };

  const getOperationalStatusLabel = (code) => {
    if (!code) {
      return t(K.ADMIN_TABLE_NA, "N/A");
    }

    const match = (operationalStatusOptions || []).find((item) => item.itemCode === code);
    return match?.label || code;
  };

  const getRoomName = (roomId) => {
    const room = (rooms || []).find((item) => Number(item.roomID) === Number(roomId));
    return room?.roomName || (roomId ? String(roomId) : t(K.ADMIN_TABLE_NA, "N/A"));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchRooms();
  }, [page, pageSize, debouncedSearch, departmentFilter, sortBy, sortDirection]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        departmentID: departmentFilter ? Number(departmentFilter) : undefined,
      });
      setRooms(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_ROOMS, "rooms")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
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

  const fetchRoomAssets = async (roomId) => {
    try {
      const data = await roomService.getAssets(roomId);
      setRoomAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch room assets:", error);
    }
  };

  const fetchAssetAssignments = async (roomAssetId) => {
    try {
      const assignments = await studentEquipmentAssignmentService.getByAsset(roomAssetId);
      setAssetAssignments(assignments || []);
    } catch (error) {
      console.error("Failed to fetch asset assignments:", error);
      setAssetAssignments([]);
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
        await roomService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_ROOM, "Room")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await roomService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_ROOM, "Room")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        departmentID: "",
        roomName: "",
        description: "",
      });
      fetchRooms();
    } catch (error) {
      console.error("Failed to save room:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ROOM, "room")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (room) => {
    setFormData({
      departmentID: room.departmentID,
      roomName: room.roomName,
      description: room.description,
    });
    setEditingId(room.roomID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_ROOM, "Are you sure you want to delete this room?"))) {
      try {
        await roomService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_ROOM, "Room")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchRooms();
      } catch (error) {
        console.error("Failed to delete room:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ROOM, "room")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await roomService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ROUTE_ROOMS, "rooms")}`);
      fetchRooms();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ROUTE_ROOMS, "rooms")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const handleRemoveAsset = async (roomId, assetId) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_REMOVE_ASSET_FROM_ROOM, "Are you sure you want to remove this asset from the room?"))) {
      try {
        await roomService.removeAsset(roomId, assetId);
        toast.success(`${t(K.ADMIN_TABLE_ASSET, "Asset")} ${t(K.ADMIN_TABLE_REMOVED_SUCCESSFULLY, "removed successfully")}`);
        fetchRoomAssets(roomId);
      } catch (error) {
        console.error("Failed to remove asset:", error);
        toast.error(`${t(K.ADMIN_TABLE_FAILED_REMOVE_ASSET, "Failed to remove asset")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setNewCondition(asset.condition || "");
    setEditingAssetCondition(false);
    setNewOperationalStatus(asset.operationalStatus || "");
    setEditingOperationalStatus(false);
    setNewRoomId(asset.roomID ? String(asset.roomID) : "");
    setEditingAssetRoom(false);
    fetchAssetAssignments(asset.roomAssetID);
  };

  const handleUpdateAssetRoom = async (roomAssetId) => {
    if (!selectedAsset?.roomID || !newRoomId) {
      return;
    }

    const targetRoomId = Number(newRoomId);
    if (!Number.isFinite(targetRoomId) || targetRoomId <= 0) {
      return;
    }

    if (targetRoomId === Number(selectedAsset.roomID)) {
      setEditingAssetRoom(false);
      return;
    }

    setIsChangingAssetRoom(true);
    try {
      await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition: newCondition || selectedAsset.condition || null,
        operationalStatus: newOperationalStatus || selectedAsset.operationalStatus || null,
        remarks: selectedAsset.remarks || null,
        targetRoomID: targetRoomId,
      });

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Room updated successfully"));
      setEditingAssetRoom(false);
      setShowAssetDetailsModal(false);
      setSelectedAsset(null);
      setAssetAssignments([]);

      if (selectedRoomId) {
        await fetchRoomAssets(selectedRoomId);
      }
    } catch (error) {
      console.error("Failed to update asset room:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsChangingAssetRoom(false);
    }
  };

  const handleUpdateAssetCondition = async (roomAssetId, condition) => {
    try {
      if (!selectedAsset?.roomID) {
        toast.error(`${t(K.ADMIN_TABLE_ROOM, "Room")}: ${t(K.ADMIN_TABLE_NA, "N/A")}`);
        return;
      }

      const updated = await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition,
        operationalStatus: newOperationalStatus || selectedAsset.operationalStatus || null,
        remarks: selectedAsset.remarks || null,
      });

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Condition updated successfully"));
      setEditingAssetCondition(false);
      setSelectedAsset((prev) => ({ ...(prev || {}), ...(updated || {}), condition }));
      setRoomAssets((prev) => prev.map((asset) => (asset.roomAssetID === roomAssetId ? {
        ...asset,
        ...(updated || {}),
        condition,
        operationalStatus: (updated && updated.operationalStatus) ? updated.operationalStatus : (newOperationalStatus || asset.operationalStatus),
      } : asset)));
    } catch (error) {
      console.error("Failed to update asset condition:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const handleUpdateOperationalStatus = async (roomAssetId, operationalStatus) => {
    try {
      if (!selectedAsset?.roomID) {
        toast.error(`${t(K.ADMIN_TABLE_ROOM, "Room")}: ${t(K.ADMIN_TABLE_NA, "N/A")}`);
        return;
      }

      const updated = await roomService.updateAsset(selectedAsset.roomID, roomAssetId, {
        serialNumber: selectedAsset.serialNumber || "",
        condition: newCondition || selectedAsset.condition || null,
        operationalStatus,
        remarks: selectedAsset.remarks || null,
      });

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Operational status updated successfully"));
      setEditingOperationalStatus(false);
      setSelectedAsset((prev) => ({ ...(prev || {}), ...(updated || {}), operationalStatus }));
      setRoomAssets((prev) => prev.map((asset) => (asset.roomAssetID === roomAssetId ? {
        ...asset,
        ...(updated || {}),
        operationalStatus,
      } : asset)));
    } catch (error) {
      console.error("Failed to update operational status:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    }
  };

  const openAssignmentModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setNewStudentId(String(assignment?.studentID || ""));
    setShowAssignmentModal(true);

    try {
      const classDetail = await classService.getById(assignment.classID);
      const students = (classDetail?.students || [])
        .filter((student) => student?.isActive !== false)
        .sort((a, b) => String(a?.studentCode || "").localeCompare(String(b?.studentCode || "")));
      setClassStudents(students);
    } catch (error) {
      console.error("Failed to load class students:", error);
      setClassStudents([]);
    }
  };

  const handleChangeAssignedStudent = async () => {
    if (!selectedAssignment || !selectedAsset || !newStudentId) {
      return;
    }

    const targetStudentId = Number(newStudentId);
    if (targetStudentId === Number(selectedAssignment.studentID)) {
      setShowAssignmentModal(false);
      return;
    }

    setIsChangingStudent(true);
    try {
      await studentEquipmentAssignmentService.create({
        studentID: targetStudentId,
        classID: Number(selectedAssignment.classID),
        roomAssetID: Number(selectedAsset.roomAssetID),
        assignedDate: new Date().toISOString(),
        isActive: true,
      });
      await studentEquipmentAssignmentService.unassign(selectedAssignment.assignmentID);

      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully"));
      await fetchAssetAssignments(selectedAsset.roomAssetID);
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
      setClassStudents([]);
    } catch (error) {
      console.error("Failed to change assigned student:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsChangingStudent(false);
    }
  };

  const handleUnassignStudent = async () => {
    if (!selectedAssignment || !selectedAsset) {
      return;
    }

    setIsUnassigningStudent(true);
    try {
      await studentEquipmentAssignmentService.unassign(selectedAssignment.assignmentID);
      toast.success(t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "Unassigned successfully"));
      await fetchAssetAssignments(selectedAsset.roomAssetID);
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
      setClassStudents([]);
    } catch (error) {
      console.error("Failed to unassign student:", error);
      toast.error(`${t(K.ADMIN_TABLE_UPDATE_FAILED, "Failed to update")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setIsUnassigningStudent(false);
    }
  };

  const openAssetModal = (roomId) => {
    setSelectedRoomId(roomId);
    setShowAssetModal(true);
    fetchRoomAssets(roomId);
  };

  const openAssetDetailsModal = (asset) => {
    handleSelectAsset(asset);
    setShowAssetDetailsModal(true);
  };

  const openQrModal = (asset) => {
    setSelectedQrAsset(asset);
    setShowQrModal(true);
  };

  const getDepartmentName = (departmentID) => {
    const dept = departments.find((d) => d.departmentID === departmentID);
    return dept ? dept.departmentName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
        <div className="flex flex-col h-full">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  departmentID: "",
                  roomName: "",
                  description: "",
                });
                setShowModal(true);
              }}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_ROOM, "Room")}`}
            </button>
            <div className="flex flex-col gap-2 sm:flex-row md:max-w-lg">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_DESCRIPTION, "Search name, description")}
                className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ROUTE_DEPARTMENTS, "Departments")}`}</option>
                {departments.map((d) => (
                  <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
          ) : (
            <div className="flex-1 min-h-0">
              <Table
                data={rooms}
                height={"100%"}
                onBulkDelete={handleBulkDelete}
                selectable={true}
                idField="roomID"
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
                    header: t(K.ADMIN_TABLE_ROOM_NAME, "Room Name"),
                    accessor: "roomName",
                    sortKey: "roomName",
                    render: (row) => renderEntityPill({
                      type: "room",
                      id: row.roomID,
                      label: row.roomCode || row.roomName || t(K.ADMIN_TABLE_NA, "N/A"),
                      fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
                    }),
                  },
                  {
                    header: t(K.ADMIN_TABLE_DEPARTMENT, "Department"),
                    accessor: "departmentID",
                    sortKey: "departmentName",
                    render: (row) => renderLookupEntityPill({
                      type: "department",
                      id: row.departmentID,
                      items: departments,
                      idField: "departmentID",
                      labelResolver: (dept) => dept?.departmentCode || dept?.departmentName || getDepartmentName(row.departmentID),
                      fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
                    }),
                  },
                  { header: t(K.ADMIN_TABLE_DESCRIPTION, "Description"), accessor: "description", sortKey: "description" },
                  {
                    header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
                    isActions: true,
                    render: (row) => (
                      <div className="space-x-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openAssetModal(row.roomID)}
                            title={t(K.ROUTE_ASSETS, "Assets")}
                            aria-label={t(K.ROUTE_ASSETS, "Assets")}
                            className="rounded bg-green-500 p-2 text-white hover:bg-green-600"
                          >
                            <MdInventory2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(row)}
                            title={t(K.ADMIN_TABLE_EDIT, "Edit")}
                            aria-label={t(K.ADMIN_TABLE_EDIT, "Edit")}
                            className="rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
                          >
                            <MdModeEditOutline className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.roomID)}
                            title={t(K.ADMIN_TABLE_DELETE, "Delete")}
                            aria-label={t(K.ADMIN_TABLE_DELETE, "Delete")}
                            className="rounded bg-red-500 p-2 text-white hover:bg-red-600"
                          >
                            <MdDelete className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Room Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_ROOM, "Room")}` : `${t(K.ADMIN_TABLE_ADD_NEW, "Add New")} ${t(K.ADMIN_TABLE_ROOM, "Room")}`}
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
                form="roomForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="roomForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_DEPARTMENT, "Department")}</label>
              <select
                name="departmentID"
                value={formData.departmentID}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_DEPARTMENT, "Select Department")}</option>
                {departments.map((dept) => (
                  <option key={dept.departmentID} value={dept.departmentID}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_ROOM_NAME, "Room Name")}</label>
              <input
                type="text"
                name="roomName"
                placeholder={t(K.ADMIN_TABLE_ROOM_NAME, "Room Name")}
                value={formData.roomName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_DESCRIPTION, "Description")}</label>
              <textarea
                name="description"
                placeholder={t(K.ADMIN_TABLE_DESCRIPTION, "Description")}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="3"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Room Assets Modal */}
      {showAssetModal && (
        <Modal
          isOpen={showAssetModal}
          onClose={() => {
            setShowAssetModal(false);
            setShowAssetDetailsModal(false);
            setSelectedAsset(null);
            setAssetAssignments([]);
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={t(K.ADMIN_TABLE_ROOM_ASSETS, "Room Assets")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                onClick={() => {
                  setShowAssetModal(false);
                  setShowAssetDetailsModal(false);
                  setSelectedAsset(null);
                  setAssetAssignments([]);
                  setShowAssignmentModal(false);
                  setSelectedAssignment(null);
                  setClassStudents([]);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
            </>
          }
        >
          <div className="mb-4">
            <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              {t(K.ADMIN_TABLE_ASSET_CREATION_HANDOVER_ONLY, "Asset creation is now available only in Handovers. Please create new room assets from the Handovers screen.")}
            </div>

            {/* Assets List */}
            <div>
              <h4 className="font-semibold mb-3 dark:text-white">{t(K.ADMIN_TABLE_CURRENT_ASSETS, "Current Assets")}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-600">
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_ASSET_NAME, "Asset Name")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_QR_CODE, "QR Code")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_CONDITION, "Condition")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_ACTIONS, "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomAssets.map((asset) => (
                      <tr key={asset.roomAssetID} className="border-b dark:border-gray-600 dark:text-white">
                        <td className="p-2">{asset.assetName}</td>
                        <td className="p-2">{asset.serialNumber}</td>
                        <td className="p-2">
                          {asset.qrCodeValue ? (
                            <button
                              type="button"
                              onClick={() => openQrModal(asset)}
                              className="rounded-md border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                            >
                              {t(K.ADMIN_TABLE_VIEW_QR, "View QR")}
                            </button>
                          ) : (
                            <span className="font-mono text-xs">{t(K.ADMIN_TABLE_NA, "N/A")}</span>
                          )}
                        </td>
                        <td className="p-2">{getConditionLabel(asset.condition)}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openAssetDetailsModal(asset)}
                              title={t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}
                              aria-label={t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}
                              className="p-2 bg-brand-500 text-white rounded hover:bg-brand-600 text-xs"
                            >
                              <MdInfoOutline className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveAsset(selectedRoomId, asset.roomAssetID)
                              }
                              title={t(K.ADMIN_TABLE_REMOVE, "Remove")}
                              aria-label={t(K.ADMIN_TABLE_REMOVE, "Remove")}
                              className="p-2 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                            >
                              <MdRemoveCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showAssetDetailsModal && selectedAsset && (
        <Modal
          isOpen={showAssetDetailsModal}
          onClose={() => {
            setShowAssetDetailsModal(false);
            setSelectedAsset(null);
            setAssetAssignments([]);
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}
          maxWidth={"max-w-4xl"}
          footer={
            <>
              <button
                onClick={() => {
                  setShowAssetDetailsModal(false);
                  setSelectedAsset(null);
                  setAssetAssignments([]);
                  setShowAssignmentModal(false);
                  setSelectedAssignment(null);
                  setClassStudents([]);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="pb-4 border-b dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Asset Code</p>
                  <p className="font-medium dark:text-white">{selectedAsset.assetCode || t(K.ADMIN_TABLE_NA, "N/A")}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Serial Number</p>
                  <p className="font-medium dark:text-white">{selectedAsset.serialNumber || t(K.ADMIN_TABLE_NA, "N/A")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Room</p>
                  {editingAssetRoom ? (
                    <div className="flex gap-2 items-center">
                      <select
                        value={newRoomId}
                        onChange={(e) => setNewRoomId(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                        {(rooms || []).map((room) => (
                          <option key={room.roomID} value={room.roomID}>{room.roomName || room.roomID}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleUpdateAssetRoom(selectedAsset.roomAssetID)}
                        disabled={isChangingAssetRoom || !newRoomId}
                        className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600 disabled:opacity-60"
                      >
                        {isChangingAssetRoom ? t(K.ADMIN_TABLE_UPDATING, "Updating...") : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingAssetRoom(false);
                          setNewRoomId(selectedAsset.roomID ? String(selectedAsset.roomID) : "");
                        }}
                        className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <p className="font-medium dark:text-white">{getRoomName(selectedAsset.roomID)}</p>
                      <button
                        onClick={() => setEditingAssetRoom(true)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {t(K.ADMIN_TABLE_EDIT, "Edit")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Condition</p>
                  {editingAssetCondition ? (
                    <div className="flex gap-2 items-center">
                      <select
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                        {conditionOptions.map((opt) => (
                          <option key={opt.itemID} value={opt.itemCode}>{opt.label || opt.itemCode}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleUpdateAssetCondition(selectedAsset.roomAssetID, newCondition)}
                        className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAssetCondition(false)}
                        className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <p className="font-medium dark:text-white">{getConditionLabel(selectedAsset.condition)}</p>
                      <button
                        onClick={() => setEditingAssetCondition(true)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {t(K.ADMIN_TABLE_EDIT, "Edit")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Operational Status</p>
                  {editingOperationalStatus ? (
                    <div className="flex gap-2 items-center">
                      <select
                        value={newOperationalStatus}
                        onChange={(e) => setNewOperationalStatus(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                        {operationalStatusOptions.map((opt) => (
                          <option key={opt.itemID} value={opt.itemCode}>{opt.label || opt.itemCode}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleUpdateOperationalStatus(selectedAsset.roomAssetID, newOperationalStatus)}
                        className="px-2 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingOperationalStatus(false)}
                        className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <p className="font-medium dark:text-white">{getOperationalStatusLabel(selectedAsset.operationalStatus)}</p>
                      <button
                        onClick={() => setEditingOperationalStatus(true)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {t(K.ADMIN_TABLE_EDIT, "Edit")}
                      </button>
                    </div>
                  )}
                </div>

                <RoomAssetIssueReporter
                  roomAssetId={selectedAsset?.roomAssetID}
                  containerClassName="col-span-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                  descriptionRows={3}
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 dark:text-white">{t(K.ADMIN_TABLE_ASSIGNMENT_STATUS, "Assignment Status")}</h4>
              {(() => {
                const activeAssignments = assetAssignments.filter(
                  (a) => a.isActive && !a.unassignedDate,
                );
                if (activeAssignments.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {t(K.ADMIN_TABLE_NO_ASSIGNMENTS, "No student assignments for this asset.")}
                    </p>
                  );
                }
                return (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex flex-wrap gap-2 pb-1">
                      {activeAssignments.map((assignment) => (
                        <button
                          key={`pill-${assignment.assignmentID}`}
                          type="button"
                          onClick={() => openAssignmentModal(assignment)}
                          className={
                            "rounded-full border px-2 py-1 text-xs font-medium transition-colors " +
                            "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                          }
                        >
                          {(assignment.studentCode || t(K.ADMIN_TABLE_NA, "N/A"))} • {(assignment.studentName || t(K.ADMIN_TABLE_NA, "N/A"))}
                        </button>
                      ))}
                    </div>
                    {activeAssignments.map((assignment) => (
                      <div
                        key={assignment.assignmentID}
                        className="p-3 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium dark:bg-blue-900 dark:text-blue-300">
                            {assignment.studentCode}
                          </div>
                          <p className="font-medium text-sm dark:text-white">{assignment.studentName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <div>Class: <span className="font-medium dark:text-white">{assignment.classCode || t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                          <div>Status: <span className="font-medium text-green-600 dark:text-green-400">Active</span></div>
                          <div>Assigned: <span className="font-medium dark:text-white">{assignment.assignedDate ? formatDateInTimeZone(assignment.assignedDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                          <div>Unassigned: <span className="font-medium dark:text-white">{assignment.unassignedDate ? formatDateInTimeZone(assignment.unassignedDate, userTimeZoneId) : t(K.ADMIN_TABLE_NA, "N/A")}</span></div>
                        </div>
                        {assignment.isCheckedOut && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">Checked Out: {assignment.checkedOutAt ? new Date(assignment.checkedOutAt).toLocaleString() : t(K.ADMIN_TABLE_NA, "N/A")}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => openAssignmentModal(assignment)}
                          className="rounded border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300"
                        >
                          {t(K.ADMIN_TABLE_VIEW_DETAILS, "View details")}
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {showAssignmentModal && selectedAssignment && (
        <Modal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={t(K.ADMIN_TABLE_ASSIGNMENT_DETAILS, "Assignment Details")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowAssignmentModal(false);
                  setSelectedAssignment(null);
                  setClassStudents([]);
                }}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
              <button
                type="button"
                onClick={handleUnassignStudent}
                disabled={isUnassigningStudent || !selectedAssignment?.isActive}
                className="rounded border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                {isUnassigningStudent
                  ? t(K.ADMIN_TABLE_UPDATING, "Updating...")
                  : t(K.ADMIN_TABLE_UNASSIGN, "Unassign student")}
              </button>
              <button
                type="button"
                onClick={handleChangeAssignedStudent}
                disabled={isChangingStudent || !newStudentId}
                className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isChangingStudent
                  ? t(K.ADMIN_TABLE_UPDATING, "Updating...")
                  : t(K.ADMIN_TABLE_UPDATE_STUDENT, "Change assigned student")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="font-semibold text-navy-700 dark:text-white">{selectedAssignment.studentName || t(K.ADMIN_TABLE_NA, "N/A")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">{selectedAssignment.studentCode || t(K.ADMIN_TABLE_NA, "N/A")}</p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                {t(K.ADMIN_TABLE_CLASS, "Class")}: <span className="font-medium">{selectedAssignment.classCode || t(K.ADMIN_TABLE_NA, "N/A")}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {t(K.ADMIN_TABLE_STATUS, "Status")}: <span className={`font-semibold ${selectedAssignment.isActive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {selectedAssignment.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")}
                </span>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-navy-700 dark:text-white">
                {t(K.ADMIN_TABLE_SELECT_STUDENT, "Select student")}
              </label>
              <select
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT, "Select")}</option>
                {classStudents.map((student) => (
                  <option key={student.studentID} value={student.studentID}>
                    {student.studentCode || t(K.ADMIN_TABLE_NA, "N/A")} - {student.studentName || t(K.ADMIN_TABLE_NA, "N/A")}
                  </option>
                ))}
              </select>
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
    </>
  );
}

