import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { roomService, departmentService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdInventory2, MdRemoveCircle } from "react-icons/md";
import Modal from "components/modal/Modal";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function RoomsTable() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedQrAsset, setSelectedQrAsset] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
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

  const openAssetModal = (roomId) => {
    setSelectedRoomId(roomId);
    setShowAssetModal(true);
    fetchRoomAssets(roomId);
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
                  { header: t(K.ADMIN_TABLE_ROOM_NAME, "Room Name"), accessor: "roomName", sortKey: "roomName" },
                  { header: t(K.ADMIN_TABLE_DEPARTMENT, "Department"), accessor: "departmentID", sortKey: "departmentName", render: (row) => getDepartmentName(row.departmentID) },
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
          onClose={() => setShowAssetModal(false)}
          title={t(K.ADMIN_TABLE_ROOM_ASSETS, "Room Assets")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                onClick={() => setShowAssetModal(false)}
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
                        <td className="p-2">{asset.condition || t(K.ADMIN_TABLE_NA, 'N/A')}</td>
                        <td className="p-2">
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

