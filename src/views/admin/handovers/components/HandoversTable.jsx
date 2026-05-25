import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { handoverService, roomService, assetService, productionLineService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Card from "components/card";
import Table from "components/table/Table";
import TableFilterModal from "components/table/TableFilterModal";
import { MdInfoOutline, MdModeEditOutline, MdDelete, MdRemoveCircle, MdAdd } from "react-icons/md";
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
  const [productionLines, setProductionLines] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [newSerialText, setNewSerialText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedHandoverId, setSelectedHandoverId] = useState(null);
  const [handoverDetails, setHandoverDetails] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("handoverDate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [formData, setFormData] = useState({
    targetSelection: "",
    handoverDate: "",
    deliveredBy: "",
    receivedBy: "",
    notes: "",
  });
  const [detailFormData, setDetailFormData] = useState({
    assetID: "",
    serialNumber: "",
    targetSelection: "",
    conditionAtHandover: "",
    remarks: "",
  });
  const [stagedItems, setStagedItems] = useState([]);

  useEffect(() => {
    fetchRooms();
    fetchAssets();
    fetchProductionLines();
    fetchConditions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchHandovers();
  }, [page, pageSize, debouncedSearch, activeFilters, sortBy, sortDirection]);

  const fetchHandovers = async () => {
    try {
      setLoading(true);
      const roomID = activeFilters.roomID?.length ? Number(activeFilters.roomID[0]) : undefined;
      const productionLineID = activeFilters.productionLineID?.length ? Number(activeFilters.productionLineID[0]) : undefined;
      const data = await handoverService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        roomID,
        productionLineID,
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

  const fetchProductionLines = async () => {
    try {
      const data = await productionLineService.getAll();
      setProductionLines(data || []);
    } catch (error) {
      console.error("Failed to fetch production lines:", error);
    }
  };

  const fetchConditions = async () => {
    try {
      const data = await dropdownService.getAssetConditions();
      setConditions(data || []);
    } catch (error) {
      console.error("Failed to fetch conditions:", error);
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

  const handleDetailInputChange = async (e) => {
    const { name, value } = e.target;
    setDetailFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "assetID" ? { serialNumber: "" } : {}),
    }));

    if (name === "assetID" && value) {
      try {
        const items = await assetService.getRoomAssets(Number(value));
        setAvailableItems(items || []);
      } catch (err) {
        console.error("Failed to load asset items:", err);
        setAvailableItems([]);
      }
      setNewSerialText("");
    } else if (name === "assetID") {
      setAvailableItems([]);
      setNewSerialText("");
    }
  };

  const handleStageAssetItem = () => {
    const assetId = Number(detailFormData.assetID);
    const isNew = detailFormData.serialNumber === "__new__";
    const serial = (isNew ? newSerialText : detailFormData.serialNumber).trim();

    if (!assetId || !serial) {
      toast.error(t(K.ADMIN_TABLE_ASSET_AND_SERIAL_REQUIRED, "Asset and serial number are required"));
      return;
    }

    const duplicateInStage = stagedItems.some((item) =>
      item.serialNumber.toLowerCase() === serial.toLowerCase()
    );

    if (duplicateInStage) {
      toast.error(t(K.ADMIN_TABLE_SERIAL_ALREADY_STAGED, "This serial number is already added"));
      return;
    }

    setStagedItems((prev) => [...prev, { assetID: assetId, serialNumber: serial }]);
    if (isNew) {
      setNewSerialText("");
    } else {
      setDetailFormData((prev) => ({ ...prev, serialNumber: "" }));
    }
  };

  const handleRemoveStagedItem = (index) => {
    setStagedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.targetSelection) {
        toast.error(t(K.ADMIN_TABLE_TARGET_REQUIRED, "Please select a target"));
        return;
      }

      const [targetType, targetIdRaw] = formData.targetSelection.split(":");
      const targetId = Number(targetIdRaw);
      const payload = {
        roomID: targetType === "room" ? targetId : null,
        productionLineID: targetType === "line" ? targetId : null,
        handoverDate: formData.handoverDate,
        deliveredBy: formData.deliveredBy,
        receivedBy: formData.receivedBy,
        notes: formData.notes,
      };

      if (editingId) {
        await handoverService.update(editingId, payload);
        toast.success(`${t(K.ADMIN_TABLE_HANDOVER, "Handover")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await handoverService.create(payload);
        toast.success(`${t(K.ADMIN_TABLE_HANDOVER, "Handover")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        targetSelection: "",
        handoverDate: "",
        deliveredBy: "",
        receivedBy: "",
        notes: "",
      });
      fetchHandovers();
    } catch (error) {
      console.error("Failed to save handover:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_HANDOVER, "handover")}: ${error.message}${details}`);
    }
  };

  const handleAddDetailSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!detailFormData.targetSelection) {
        toast.error(t(K.ADMIN_TABLE_TARGET_REQUIRED, "Please select a target"));
        return;
      }

      if (stagedItems.length === 0) {
        toast.error(t(K.ADMIN_TABLE_STAGED_ITEMS_EMPTY, "Add at least one asset item"));
        return;
      }

      const [targetType, targetIdRaw] = detailFormData.targetSelection.split(":");
      const targetId = Number(targetIdRaw);
      if (!targetType || !targetId) {
        toast.error(t(K.ADMIN_TABLE_TARGET_REQUIRED, "Please select a target"));
        return;
      }

      const grouped = stagedItems.reduce((acc, item) => {
        if (!acc[item.assetID]) {
          acc[item.assetID] = [];
        }
        acc[item.assetID].push(item.serialNumber);
        return acc;
      }, {});

      for (const [assetIdRaw, serialNumbers] of Object.entries(grouped)) {
        const assetID = Number(assetIdRaw);
        const roomID = targetType === "room" ? targetId : null;
        const productionLineID = targetType === "line" ? targetId : null;

        await handoverService.addDetail(selectedHandoverId, {
          assetID,
          quantity: serialNumbers.length,
          serialNumbers,
          roomID,
          productionLineID,
          conditionAtHandover: detailFormData.conditionAtHandover || null,
          remarks: detailFormData.remarks || null,
        });
      }

      toast.success(t(K.ADMIN_TABLE_DETAIL_ADDED_SUCCESSFULLY, "Detail added successfully"));
      setDetailFormData({
        assetID: "",
        serialNumber: "",
        targetSelection: "",
        conditionAtHandover: "",
        remarks: "",
      });
      setAvailableItems([]);
      setNewSerialText("");
      setStagedItems([]);
      fetchHandoverDetails(selectedHandoverId);
    } catch (error) {
      console.error("Failed to add detail:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_FAILED_ADD_DETAIL, "Failed to add detail")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (handover) => {
    // Format date for datetime-local input
    const dateObj = new Date(handover.handoverDate);
    const formattedDate = dateObj.toISOString().slice(0, 16);

    let targetSelection = "";
    if (handover.roomID) {
      targetSelection = `room:${handover.roomID}`;
    } else if (handover.productionLineID) {
      targetSelection = `line:${handover.productionLineID}`;
    }

    setFormData({
      targetSelection,
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
    setDetailFormData({
      assetID: "",
      serialNumber: "",
      targetSelection: "",
      conditionAtHandover: "",
      remarks: "",
    });    setAvailableItems([]);    setNewSerialText("");    setStagedItems([]);
    fetchHandoverDetails(handoverId);
    setShowDetailsModal(true);
  };

  const getTargetName = (row) => {
    if (row.roomID) {
      const room = rooms.find((r) => r.roomID === row.roomID);
      return room ? room.roomName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
    }
    if (row.productionLineID) {
      const line = productionLines.find((l) => l.productionLineID === row.productionLineID);
      return line ? line.lineName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
    }
    return t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const getTargetType = (row) => {
    if (row.roomID) return t(K.ROUTE_ROOMS, "Room");
    if (row.productionLineID) return t(K.ROUTE_PRODUCTION_LINES, "Line");
    return "";
  };

  const getAssetName = (assetID) => {
    const asset = assets.find((a) => a.assetID === assetID);
    return asset ? asset.assetName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const formatDate = (dateString) => {
    return formatDateInTimeZone(dateString, userTimeZoneId);
  };

  const filterableColumns = [
    { key: "roomID", label: t(K.ROUTE_ROOMS, "Room"), options: rooms.map((r) => ({ value: String(r.roomID), label: r.roomName })) },
    { key: "productionLineID", label: t(K.ROUTE_PRODUCTION_LINES, "Production Line"), options: productionLines.map((l) => ({ value: String(l.productionLineID), label: l.lineName })) },
  ];

  const handleFilterApply = (newFilters) => { setActiveFilters(newFilters); setPage(1); };

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({ targetSelection: "", handoverDate: "", deliveredBy: "", receivedBy: "", notes: "" });
                setShowModal(true);
              }}
              className="shrink-0 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              {`${t(K.ADMIN_TABLE_CREATE, "Create")} ${t(K.ADMIN_TABLE_HANDOVER, "Handover")}`}
            </button>
            <TableFilterModal filterableColumns={filterableColumns} activeFilters={activeFilters} onFilterApply={handleFilterApply} />
            <input
              type="text"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              placeholder={t(K.ADMIN_TABLE_SEARCH_DELIVERED_RECEIVED_BY, "Search delivered by, received by")}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
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
              {
                header: t(K.ADMIN_TABLE_TARGET_LOCATION, 'Target'),
                accessor: 'roomID',
                sortKey: "roomName",
                filterKey: "roomID",
                render: (row) => (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getTargetType(row)}</div>
                    <div>{getTargetName(row)}</div>
                  </div>
                )
              },
              { header: t(K.ADMIN_TABLE_HANDOVER_DATE, 'Handover Date'), accessor: 'handoverDate', sortKey: "handoverDate", render: (row) => formatDate(row.handoverDate) },
              { header: t(K.ADMIN_TABLE_DELIVERED_BY, 'Delivered By'), accessor: 'deliveredBy', sortKey: "deliveredBy" },
              { header: t(K.ADMIN_TABLE_RECEIVED_BY, 'Received By'), accessor: 'receivedBy', sortKey: "receivedBy" },
              {
                header: t(K.ADMIN_TABLE_ACTIONS, 'Actions'),
                isActions: true,
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
            filterableColumns={filterableColumns}
            activeFilters={activeFilters}
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
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_TARGET_LOCATION, "Target")}</label>
              <select
                name="targetSelection"
                value={formData.targetSelection}
                onChange={handleInputChange}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">{t(K.ADMIN_TABLE_SELECT_TARGET_LOCATION, "Select target")}</option>
                <optgroup label={t(K.ROUTE_ROOMS, "Rooms")}>
                  {rooms.map((room) => (
                    <option key={`room-${room.roomID}`} value={`room:${room.roomID}`}>
                      {room.roomName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t(K.ROUTE_PRODUCTION_LINES, "Production Lines")}>
                  {productionLines.map((line) => (
                    <option key={`line-${line.productionLineID}`} value={`line:${line.productionLineID}`}>
                      {line.lineName} ({line.lineCode})
                    </option>
                  ))}
                </optgroup>
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
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number")}</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      {availableItems.length > 0 ? (
                        <select
                          name="serialNumber"
                          value={detailFormData.serialNumber}
                          onChange={handleDetailInputChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        >
                          <option value="">{t(K.ADMIN_TABLE_SELECT_SERIAL_NUMBER, "Select serial number")}</option>
                          {availableItems
                            .filter((item) => !stagedItems.some((s) => s.serialNumber.toLowerCase() === item.serialNumber.toLowerCase()))
                            .map((item) => (
                              <option key={item.roomAssetID} value={item.serialNumber}>
                                {item.serialNumber}{item.roomName ? ` — ${item.roomName}` : ""}
                              </option>
                            ))}
                          <option value="__new__">＋ {t(K.ADMIN_TABLE_NEW_SERIAL_NUMBER, "New serial number...")}</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="serialNumber"
                          value={detailFormData.serialNumber}
                          onChange={handleDetailInputChange}
                          className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                          placeholder={t(K.ADMIN_TABLE_SERIAL_NUMBER_EXAMPLE, "e.g., SN-12345")}
                        />
                      )}
                      <button
                        type="button"
                        onClick={handleStageAssetItem}
                        className="inline-flex items-center gap-1 rounded bg-brand-500 px-3 py-2 text-white hover:bg-brand-600"
                      >
                        <MdAdd className="h-4 w-4" />
                        {t(K.ADMIN_TABLE_ADD_ITEM, "Add")}
                      </button>
                    </div>
                    {detailFormData.serialNumber === "__new__" && (
                      <input
                        type="text"
                        value={newSerialText}
                        onChange={(e) => setNewSerialText(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-300"
                        placeholder={t(K.ADMIN_TABLE_SERIAL_NUMBER_EXAMPLE, "e.g., SN-12345")}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_TARGET_LOCATION, "Target")}</label>
                  <select
                    name="targetSelection"
                    value={detailFormData.targetSelection}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    required
                  >
                    <option value="">{t(K.ADMIN_TABLE_SELECT_TARGET_LOCATION, "Select target")}</option>
                    <optgroup label={t(K.ROUTE_ROOMS, "Rooms")}>
                      {rooms.map((room) => (
                        <option key={`room-${room.roomID}`} value={`room:${room.roomID}`}>
                          {room.roomName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t(K.ROUTE_PRODUCTION_LINES, "Production Lines")}>
                      {productionLines.map((line) => (
                        <option key={`line-${line.productionLineID}`} value={`line:${line.productionLineID}`}>
                          {line.lineName} ({line.lineCode})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_CONDITION_AT_HANDOVER, "Condition at Handover")}</label>
                  <select
                    name="conditionAtHandover"
                    value={detailFormData.conditionAtHandover}
                    onChange={handleDetailInputChange}
                    className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="">{t(K.ADMIN_TABLE_SELECT_CONDITION_OPTIONAL, "Select Condition (Optional)")}</option>
                    {conditions.map((cond) => (
                      <option key={cond.itemCode} value={cond.itemCode}>
                        {cond.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_STAGED_ITEMS, "Staged Items")}</label>
                  <div className="max-h-36 overflow-auto rounded border dark:border-gray-500">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-600/50">
                        <tr>
                          <th className="p-2 text-left">{t(K.ADMIN_TABLE_ASSET, "Asset")}</th>
                          <th className="p-2 text-left">{t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number")}</th>
                          <th className="p-2 text-right">{t(K.ADMIN_TABLE_ACTIONS, "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagedItems.length === 0 ? (
                          <tr>
                            <td className="p-2 text-gray-500 dark:text-gray-300" colSpan={3}>{t(K.ADMIN_TABLE_STAGED_ITEMS_EMPTY, "No items added yet")}</td>
                          </tr>
                        ) : (
                          stagedItems.map((item, index) => (
                            <tr key={`${item.assetID}-${item.serialNumber}-${index}`} className="border-t dark:border-gray-600">
                              <td className="p-2 dark:text-white">{getAssetName(item.assetID)}</td>
                              <td className="p-2 dark:text-white">{item.serialNumber}</td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStagedItem(index)}
                                  className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                                  title={t(K.ADMIN_TABLE_REMOVE, "Remove")}
                                >
                                  {t(K.ADMIN_TABLE_REMOVE, "Remove")}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-white">{t(K.ADMIN_TABLE_PENDING_GROUPED_SUMMARY, "Pending grouped summary")}</label>
                  <div className="rounded border p-2 text-xs dark:border-gray-500">
                    {Object.entries(stagedItems.reduce((acc, item) => {
                      acc[item.assetID] = (acc[item.assetID] || 0) + 1;
                      return acc;
                    }, {})).length === 0 ? (
                      <span className="text-gray-500 dark:text-gray-300">{t(K.ADMIN_TABLE_STAGED_ITEMS_EMPTY, "No items added yet")}</span>
                    ) : (
                      Object.entries(stagedItems.reduce((acc, item) => {
                        acc[item.assetID] = (acc[item.assetID] || 0) + 1;
                        return acc;
                      }, {})).map(([assetId, count]) => (
                        <div key={assetId} className="dark:text-white">
                          {getAssetName(Number(assetId))}: {count}
                        </div>
                      ))
                    )}
                  </div>
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

