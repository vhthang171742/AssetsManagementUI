import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { handoverService, roomService, assetService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdInfoOutline, MdModeEditOutline, MdDelete, MdRemoveCircle } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";

export default function HandoversTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [handovers, setHandovers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedHandoverId, setSelectedHandoverId] = useState(null);
  const [handoverDetails, setHandoverDetails] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("handoverDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    roomID: "",
    handoverDate: "",
    deliveredBy: "",
    receivedBy: "",
    notes: "",
  });
  const [detailFormData, setDetailFormData] = useState({
    assetID: "",
    quantity: 1,
    conditionAtHandover: "",
    remarks: "",
  });

  useEffect(() => {
    fetchRooms();
    fetchAssets();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchHandovers();
  }, [page, pageSize, debouncedSearch, roomFilter, sortBy, sortDirection]);

  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const data = await handoverService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        roomID: roomFilter ? Number(roomFilter) : undefined,
      });
      setHandovers(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch handovers:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_HANDOVERS, "handovers")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomService.getAll();
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
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

  const fetchHandoverDetails = async (handoverId) => {
    try {
      const data = await handoverService.getDetails(handoverId);
      setHandoverDetails(data || []);
    } catch (error) {
      console.error("Failed to fetch handover details:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDetailInputChange = (e) => {
    const { name, value } = e.target;
    setDetailFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await handoverService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_HANDOVER, "Handover")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await handoverService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_HANDOVER, "Handover")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        roomID: "",
        handoverDate: "",
        deliveredBy: "",
        receivedBy: "",
        notes: "",
      });
      fetchHandovers();
    } catch (error) {
      console.error("Failed to save handover:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_HANDOVER, "handover")}: ${error.message}${details}`);
    }
  };

  const handleAddDetailSubmit = async (e) => {
    e.preventDefault();
    try {
      await handoverService.addDetail(selectedHandoverId, detailFormData);
      toast.success(t(K.ADMIN_TABLE_DETAIL_ADDED_SUCCESSFULLY, "Detail added successfully"));
      setDetailFormData({
        assetID: "",
        quantity: 1,
        conditionAtHandover: "",
        remarks: "",
      });
      fetchHandoverDetails(selectedHandoverId);
    } catch (error) {
      console.error("Failed to add detail:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_FAILED_ADD_DETAIL, "Failed to add detail")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (handover) => {
    // Format date for datetime-local input
    const dateObj = new Date(handover.handoverDate);
    const formattedDate = dateObj.toISOString().slice(0, 16);

    setFormData({
      roomID: handover.roomID,
      handoverDate: formattedDate,
      deliveredBy: handover.deliveredBy || "",
      receivedBy: handover.receivedBy || "",
      notes: handover.notes || "",
    });
    setEditingId(handover.handoverID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_HANDOVER, "Are you sure you want to delete this handover?"))) {
      try {
        await handoverService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_HANDOVER, "Handover")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchHandovers();
      } catch (error) {
        console.error("Failed to delete handover:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_HANDOVER, "handover")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await handoverService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ROUTE_HANDOVERS, "handovers")}`);
      fetchHandovers();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ROUTE_HANDOVERS, "handovers")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const handleDeleteDetail = async (detailId) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_DETAIL, "Are you sure you want to delete this detail?"))) {
      try {
        await handoverService.deleteDetail(detailId);
        toast.success(t(K.ADMIN_TABLE_DETAIL_DELETED_SUCCESSFULLY, "Detail deleted successfully"));
        fetchHandoverDetails(selectedHandoverId);
      } catch (error) {
        console.error("Failed to delete detail:", error);
        toast.error(`${t(K.ADMIN_TABLE_FAILED_DELETE_DETAIL, "Failed to delete detail")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const openDetailsModal = (handoverId) => {
    setSelectedHandoverId(handoverId);
    fetchHandoverDetails(handoverId);
    setShowDetailsModal(true);
  };

  const getRoomName = (roomID) => {
    const room = rooms.find((r) => r.roomID === roomID);
    return room ? room.roomName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const getAssetName = (assetID) => {
    const asset = assets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const formatDate = (dateString) => {
    return formatDateInTimeZone(dateString, userTimeZoneId);
  };

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                roomID: "",
                handoverDate: "",
                deliveredBy: "",
                receivedBy: "",
                notes: "",
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            {`${t(K.ADMIN_TABLE_CREATE, "Create")} ${t(K.ADMIN_TABLE_HANDOVER, "Handover")}`}
          </button>
          <div className="flex flex-col gap-2 sm:flex-row md:max-w-lg">
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder={t(K.ADMIN_TABLE_SEARCH_DELIVERED_RECEIVED_BY, "Search delivered by, received by")}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={roomFilter}
              onChange={(e) => {
                setRoomFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ROUTE_ROOMS, "Rooms")}`}</option>
              {rooms.map((r) => (
                <option key={r.roomID} value={r.roomID}>{r.roomName}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
        ) : (
          <Table
            data={handovers}
            onBulkDelete={handleBulkDelete}
            selectable={true}
            idField="handoverID"
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
              { header: t(K.ADMIN_TABLE_ROOM, 'Room'), accessor: 'roomID', sortKey: "roomName", render: (row) => getRoomName(row.roomID) },
              { header: t(K.ADMIN_TABLE_HANDOVER_DATE, 'Handover Date'), accessor: 'handoverDate', sortKey: "handoverDate", render: (row) => formatDate(row.handoverDate) },
              { header: t(K.ADMIN_TABLE_DELIVERED_BY, 'Delivered By'), accessor: 'deliveredBy', sortKey: "deliveredBy" },
              { header: t(K.ADMIN_TABLE_RECEIVED_BY, 'Received By'), accessor: 'receivedBy', sortKey: "receivedBy" },
              {
                header: t(K.ADMIN_TABLE_ACTIONS, 'Actions'),
                render: (row) => (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailsModal(row.handoverID)}
                        title={t(K.ADMIN_TABLE_DETAILS, "Details")}
                        aria-label={t(K.ADMIN_TABLE_DETAILS, "Details")}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <MdInfoOutline className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(row)}
                        title={t(K.ADMIN_TABLE_EDIT, "Edit")}
                        aria-label={t(K.ADMIN_TABLE_EDIT, "Edit")}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <MdModeEditOutline className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.handoverID)}
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
      </Card>

      {/* Handover Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_HANDOVER, "Handover")}` : `${t(K.ADMIN_TABLE_CREATE_NEW, "Create New")} ${t(K.ADMIN_TABLE_HANDOVER, "Handover")}`}
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
                form="handoverForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="handoverForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_ROOM, "Room")}</label>
              <select
                name="roomID"
                value={formData.roomID}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_ROOM, "Select Room")}</option>
                {rooms.map((room) => (
                  <option key={room.roomID} value={room.roomID}>
                    {room.roomName}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_HANDOVER_DATE, "Handover Date")}</label>
              <input
                type="datetime-local"
                name="handoverDate"
                value={formData.handoverDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_DELIVERED_BY, "Delivered By")}</label>
              <input
                type="text"
                name="deliveredBy"
                placeholder={t(K.ADMIN_TABLE_DELIVERED_BY, "Delivered By")}
                value={formData.deliveredBy}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_RECEIVED_BY, "Received By")}</label>
              <input
                type="text"
                name="receivedBy"
                placeholder={t(K.ADMIN_TABLE_RECEIVED_BY, "Received By")}
                value={formData.receivedBy}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_NOTES, "Notes")}</label>
              <textarea
                name="notes"
                placeholder={t(K.ADMIN_TABLE_NOTES, "Notes")}
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                rows="3"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Handover Details Modal */}
      {showDetailsModal && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={t(K.ADMIN_TABLE_HANDOVER_DETAILS, "Handover Details")}
          maxWidth={"max-w-2xl"}
          footer={
            <>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                {t(K.MODAL_CLOSE, "Close")}
              </button>
            </>
          }
        >
          <div className="mb-4">
            {/* Add Detail Form */}
            <form
              onSubmit={handleAddDetailSubmit}
              className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
            >
              <h4 className="font-semibold mb-3 dark:text-white">{t(K.ADMIN_TABLE_ADD_ASSET_TO_HANDOVER, "Add Asset to Handover")}</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_ASSET, "Asset")}</label>
                  <select
                    name="assetID"
                    value={detailFormData.assetID}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  >
                    <option value="">{t(K.ADMIN_TABLE_SELECT_ASSET, "Select Asset")}</option>
                    {assets.map((asset) => (
                      <option key={asset.assetID} value={asset.assetID}>
                        {asset.assetName} ({asset.assetCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_QUANTITY, "Quantity")}</label>
                  <input
                    type="number"
                    name="quantity"
                    placeholder={t(K.ADMIN_TABLE_QUANTITY_EXAMPLE, "e.g., 5")}
                    value={detailFormData.quantity}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                    required
                    min="1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_CONDITION_AT_HANDOVER, "Condition at Handover")}</label>
                  <input
                    type="text"
                    name="conditionAtHandover"
                    placeholder={t(K.ADMIN_TABLE_CONDITION_EXAMPLE, "e.g., Good, Fair, Poor")}
                    value={detailFormData.conditionAtHandover}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_REMARKS, "Remarks")}</label>
                  <textarea
                    name="remarks"
                    placeholder={t(K.ADMIN_TABLE_ADDITIONAL_REMARKS, "Additional remarks...")}
                    value={detailFormData.remarks}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                    rows="2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {t(K.ADMIN_TABLE_ADD_DETAIL, "Add Detail")}
              </button>
            </form>

            {/* Details List */}
            <div>
              <h4 className="font-semibold mb-3 dark:text-white">{t(K.ADMIN_TABLE_CURRENT_DETAILS, "Current Details")}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-600">
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_ASSET, "Asset")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_QUANTITY, "Quantity")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_CONDITION, "Condition")}</th>
                      <th className="text-left p-2 dark:text-white">{t(K.ADMIN_TABLE_ACTIONS, "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverDetails.map((detail) => (
                      <tr key={detail.handoverDetailID} className="border-b dark:border-gray-600 dark:text-white">
                        <td className="p-2">{detail.assetName}</td>
                        <td className="p-2">{detail.quantity}</td>
                        <td className="p-2">{detail.conditionAtHandover}</td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              handleDeleteDetail(detail.handoverDetailID)
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
    </>
  );
}

