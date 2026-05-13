import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getData as getCountryData } from "country-list";
import { assetService, assetCategoryService, roomService, productionLineService, classService, studentEquipmentAssignmentService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import { renderEntityPill } from "components/table/entityPillHelpers";
import { MdModeEditOutline, MdDelete, MdInfoOutline } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";
import EntityPill from "components/EntityPill";
import { useLanguage } from "context/LanguageContext";
import { useAuth } from "context/AuthContext";
import { formatDateInTimeZone } from "services/dateTimeService";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function AssetsTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [operationalStatusOptions, setOperationalStatusOptions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChildAssets, setLoadingChildAssets] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssetChildrenModal, setShowAssetChildrenModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedParentAsset, setSelectedParentAsset] = useState(null);
  const [childAssets, setChildAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetAssignments, setAssetAssignments] = useState([]);
  const [editingAssetCondition, setEditingAssetCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [editingOperationalStatus, setEditingOperationalStatus] = useState(false);
  const [newOperationalStatus, setNewOperationalStatus] = useState("");
  const [editingAssetRoom, setEditingAssetRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isChangingAssetRoom, setIsChangingAssetRoom] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [newStudentId, setNewStudentId] = useState("");
  const [isChangingStudent, setIsChangingStudent] = useState(false);
  const [isUnassigningStudent, setIsUnassigningStudent] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("assetCode");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    assetCode: "",
    assetName: "",
    categoryID: "",
    brand: "",
    model: "",
    specification: "",
    countryOfOrigin: "",
    unit: "",
    unitPrice: "",
    purchaseDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchRooms();
    fetchStatusOptions();
  }, []);

  const fetchStatusOptions = async () => {
    try {
      const [conditions, operationalStatuses] = await Promise.all([
        dropdownService.getAssetConditions(),
        dropdownService.getEquipmentStatus(),
      ]);
      setConditionOptions(conditions || []);
      setOperationalStatusOptions(operationalStatuses || []);
    } catch (error) {
      console.error("Failed to fetch asset status options:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchAssets();
  }, [page, pageSize, debouncedSearch, categoryFilter, sortBy, sortDirection]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        categoryID: categoryFilter ? Number(categoryFilter) : undefined,
      });
      setAssets(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_ASSETS, "assets")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await assetCategoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      const data = await dropdownService.getAssetUnits();
      setUnits(data || []);
    } catch (error) {
      console.error("Failed to fetch units:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await roomService.getAll();
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
    }
  };

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

  const fetchAssetAssignments = async (roomAssetId) => {
    try {
      const assignments = await studentEquipmentAssignmentService.getByAsset(roomAssetId);
      setAssetAssignments(assignments || []);
    } catch (error) {
      console.error("Failed to fetch asset assignments:", error);
      setAssetAssignments([]);
    }
  };

  const handleSelectChildAsset = (asset) => {
    setSelectedAsset(asset);
    setNewCondition(asset.condition || "");
    setEditingAssetCondition(false);
    setNewOperationalStatus(asset.operationalStatus || "");
    setEditingOperationalStatus(false);
    setNewRoomId(asset.roomID ? String(asset.roomID) : "");
    setEditingAssetRoom(false);
    fetchAssetAssignments(asset.roomAssetID);
  };

  const refreshSelectedParentChildAssets = async () => {
    if (selectedParentAsset) {
      await openAssetChildrenModal(selectedParentAsset, { preserveOpenState: true });
    }
  };

  const openAssetChildrenModal = async (asset, options = {}) => {
    const { preserveOpenState = false } = options;
    if (!preserveOpenState) {
      setShowAssetChildrenModal(true);
    }

    setSelectedParentAsset(asset);
    setSelectedAsset(null);
    setAssetAssignments([]);
    setLoadingChildAssets(true);

    try {
      const [allRooms, allLines] = await Promise.all([
        roomService.getAll(),
        productionLineService.getAll(),
      ]);

      const roomList = allRooms || [];
      setRooms(roomList);

      const roomAssetsByRoom = await Promise.all(
        roomList.map(async (room) => {
          try {
            const items = await roomService.getAssets(room.roomID);
            return (items || []).map((item) => ({
              ...item,
              roomName: room.roomName || item.roomName || null,
            }));
          } catch {
            return [];
          }
        }),
      );

      const allRoomAssets = roomAssetsByRoom.flat();

      const lineList = allLines || [];
      const lineAssetsByLine = await Promise.all(
        lineList.map(async (line) => {
          try {
            const items = await productionLineService.getAssets(line.productionLineID);
            return (items || []).map((item) => ({
              ...item,
              lineName: line.lineName || item.lineName || null,
            }));
          } catch {
            return [];
          }
        }),
      );

      const allLineAssets = lineAssetsByLine.flat();
      const activeLineAssignmentsByRoomAsset = allLineAssets.reduce((acc, item) => {
        if (!item?.roomAssetID) {
          return acc;
        }

        const isActive = item.isActive !== false && !item.unassignedDate;
        if (!isActive) {
          return acc;
        }

        if (!acc[item.roomAssetID]) {
          acc[item.roomAssetID] = [];
        }

        const resolvedName = item.lineName || item.productionLineName ||
          lineList.find((line) => Number(line.productionLineID) === Number(item.productionLineID))?.lineName ||
          String(item.productionLineID || "");
        if (resolvedName) {
          acc[item.roomAssetID].push(resolvedName);
        }

        return acc;
      }, {});

      const matchesParentAsset = (item) => {
        const sameAssetId = Number(item?.assetID) === Number(asset?.assetID);
        const sameCode = item?.assetCode && asset?.assetCode && String(item.assetCode) === String(asset.assetCode);
        return sameAssetId || sameCode;
      };

      const normalizedChildren = allRoomAssets
        .filter(matchesParentAsset)
        .map((item) => {
          const lineNames = (activeLineAssignmentsByRoomAsset[item.roomAssetID] || [])
            .filter((name, index, arr) => arr.indexOf(name) === index);

          return {
            ...item,
            locationSummary: lineNames.length > 0
              ? `${item.roomName || getRoomName(item.roomID)} • ${lineNames.join(", ")}`
              : `${item.roomName || getRoomName(item.roomID)}`,
            productionLineNames: lineNames,
          };
        });

      setChildAssets(normalizedChildren);
    } catch (error) {
      console.error("Failed to fetch child assets:", error);
      setChildAssets([]);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_CURRENT_ASSETS, "Current Assets")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoadingChildAssets(false);
    }
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
      setSelectedAsset(null);
      setAssetAssignments([]);
      await refreshSelectedParentChildAssets();
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
      setChildAssets((prev) => prev.map((item) => (
        item.roomAssetID === roomAssetId
          ? {
              ...item,
              ...(updated || {}),
              condition,
              operationalStatus: (updated && updated.operationalStatus)
                ? updated.operationalStatus
                : (newOperationalStatus || item.operationalStatus),
            }
          : item
      )));
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
      setChildAssets((prev) => prev.map((item) => (
        item.roomAssetID === roomAssetId
          ? {
              ...item,
              ...(updated || {}),
              operationalStatus,
            }
          : item
      )));
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "unitPrice" ? parseFloat(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await assetService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_ASSET, "Asset")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await assetService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_ASSET, "Asset")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        assetCode: "",
        assetName: "",
        categoryID: "",
        brand: "",
        model: "",
        specification: "",
        countryOfOrigin: "",
        unit: "",
        unitPrice: "",
        purchaseDate: "",
        notes: "",
      });
      fetchAssets();
    } catch (error) {
      console.error("Failed to save asset:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ASSET, "asset")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (asset) => {
    setFormData({
      assetCode: asset.assetCode || "",
      assetName: asset.assetName || "",
      categoryID: asset.categoryID || "",
      brand: asset.brand || "",
      model: asset.model || "",
      specification: asset.specification || "",
      countryOfOrigin: asset.countryOfOrigin || "",
      unit: asset.unit || "",
      unitPrice: asset.unitPrice ?? "",
      purchaseDate: asset.purchaseDate || "",
      notes: asset.notes || "",
    });
    setEditingId(asset.assetID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_ASSET, "Are you sure you want to delete this asset?"))) {
      try {
        await assetService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_ASSET, "Asset")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchAssets();
      } catch (error) {
        console.error("Failed to delete asset:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_ASSET, "asset")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await assetService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ROUTE_ASSETS, "assets")}`);
      fetchAssets();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ROUTE_ASSETS, "assets")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const getCategoryName = (categoryID) => {
    const category = categories.find((c) => c.categoryID === categoryID);
    return category ? category.categoryName : t(K.ADMIN_TABLE_UNKNOWN, "Unknown");
  };

  const countryOptions = useMemo(() => {
    const countries = getCountryData()
      .map((country) => country.name)
      .sort((a, b) => a.localeCompare(b));

    if (formData.countryOfOrigin && !countries.includes(formData.countryOfOrigin)) {
      return [formData.countryOfOrigin, ...countries];
    }

    return countries;
  }, [formData.countryOfOrigin]);

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              assetCode: "",
              assetName: "",
              categoryID: "",
              brand: "",
              model: "",
              specification: "",
              countryOfOrigin: "",
              unit: "",
              unitPrice: "",
              purchaseDate: "",
              notes: "",
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_ASSET, "Asset")}`}
        </button>

        <div className="grid w-full gap-2 sm:grid-cols-2 md:max-w-2xl">
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_CODE_NAME_BRAND_MODEL, "Search code, name, brand, model")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ROUTE_CATEGORIES, "Categories")}`}</option>
            {categories.map((cat) => (
              <option key={cat.categoryID} value={cat.categoryID}>
                {cat.categoryName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          data={assets}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="assetID"
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
              header: t(K.ADMIN_TABLE_CODE, 'Code'),
              accessor: 'assetCode',
              sortKey: "assetCode",
              render: (row) => renderEntityPill({
                type: "asset",
                id: row.assetID,
                label: row.assetCode || row.assetName || String(row.assetID),
                fallbackLabel: t(K.ADMIN_TABLE_NA, "N/A"),
              }),
            },
            { header: t(K.ADMIN_TABLE_NAME, 'Name'), accessor: 'assetName', sortKey: "assetName" },
            { header: t(K.ADMIN_TABLE_CATEGORY, 'Category'), accessor: 'categoryID', sortKey: "categoryName", render: (row) => getCategoryName(row.categoryID) },
            { header: t(K.ADMIN_TABLE_BRAND, 'Brand'), accessor: 'brand', sortKey: "brand" },
            { header: t(K.ADMIN_TABLE_QUANTITY, 'Quantity'), accessor: 'quantity', sortKey: "quantity" },
            { header: t(K.ADMIN_TABLE_UNIT_PRICE, 'Unit Price'), accessor: 'unitPrice', sortKey: "unitPrice", render: (row) => (row.unitPrice != null ? `$${parseFloat(row.unitPrice).toFixed(2)}` : '') },
            {
              header: t(K.ADMIN_TABLE_ACTIONS, 'Actions'),
              isActions: true,
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAssetChildrenModal(row)}
                    title={t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}
                    aria-label={t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}
                    className="p-2 bg-brand-500 text-white rounded hover:bg-brand-600"
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
                    onClick={() => handleDelete(row.assetID)}
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

      {/* Modal */}
      {showModal && (
        <>
          {/* using shared Modal component */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_ASSET, "Asset")}` : `${t(K.ADMIN_TABLE_ADD_NEW, "Add New")} ${t(K.ADMIN_TABLE_ASSET, "Asset")}`}
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
                  form="assetForm"
                  className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
                >
                  {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
                </button>
              </>
            }
          >
            <form id="assetForm" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  name="assetCode"
                  placeholder={t(K.ADMIN_TABLE_ASSET_CODE, "Asset Code")}
                  value={formData.assetCode}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
                <input
                  type="text"
                  name="assetName"
                  placeholder={t(K.ADMIN_TABLE_ASSET_NAME, "Asset Name")}
                  value={formData.assetName}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
                <select
                  name="categoryID"
                  value={formData.categoryID}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">{t(K.ADMIN_TABLE_SELECT_CATEGORY, "Select Category")}</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryID} value={cat.categoryID}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="brand"
                  placeholder={t(K.ADMIN_TABLE_BRAND, "Brand")}
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  name="model"
                  placeholder={t(K.ADMIN_TABLE_MODEL, "Model")}
                  value={formData.model}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  name="specification"
                  placeholder={t(K.ADMIN_TABLE_SPECIFICATION, "Specification")}
                  value={formData.specification}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <select
                  name="countryOfOrigin"
                  value={formData.countryOfOrigin}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{t(K.ADMIN_TABLE_SELECT_COUNTRY_OF_ORIGIN_OPTIONAL, "Select Country of Origin (Optional)")}</option>
                  {countryOptions.map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                </select>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">{t(K.ADMIN_TABLE_SELECT_UNIT, "Select Unit")}</option>
                  {units.map((unit) => (
                    <option key={unit.itemCode} value={unit.itemCode}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="unitPrice"
                  placeholder={t(K.ADMIN_TABLE_UNIT_PRICE, "Unit Price")}
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  step="0.01"
                />
                <input
                  type="datetime-local"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <textarea
                  name="notes"
                  placeholder={t(K.ADMIN_TABLE_NOTES, "Notes")}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </form>
          </Modal>
        </>
      )}

      {showAssetChildrenModal && (
        <Modal
          isOpen={showAssetChildrenModal}
          onClose={() => {
            setShowAssetChildrenModal(false);
            setSelectedParentAsset(null);
            setChildAssets([]);
            setSelectedAsset(null);
            setAssetAssignments([]);
            setShowAssignmentModal(false);
            setSelectedAssignment(null);
            setClassStudents([]);
          }}
          title={`${t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")} - ${selectedParentAsset?.assetCode || selectedParentAsset?.assetName || ""}`}
          maxWidth={"max-w-6xl"}
          footer={
            <>
              <button
                onClick={() => {
                  setShowAssetChildrenModal(false);
                  setSelectedParentAsset(null);
                  setChildAssets([]);
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
          <div className="grid grid-cols-3 gap-4 min-h-96">
            <div className="border-r dark:border-gray-700 pr-4">
              <h4 className="font-semibold mb-3 text-sm dark:text-white">{t(K.ADMIN_TABLE_CURRENT_ASSETS, "Current Assets")}</h4>
              {loadingChildAssets ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</p>
              ) : childAssets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {t(K.TABLE_NO_DATA, "No data")}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {childAssets.map((asset) => (
                    <button
                      key={asset.roomAssetID}
                      onClick={() => handleSelectChildAsset(asset)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedAsset?.roomAssetID === asset.roomAssetID
                          ? "border-brand-500 bg-brand-50 dark:bg-navy-800 dark:border-brand-400"
                          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                      }`}
                    >
                      <p className="font-semibold text-sm dark:text-white">{asset.assetName || asset.assetCode}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">SN: {asset.serialNumber}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                          {t(K.ADMIN_TABLE_ROOM, "Room")}: {asset.roomName || getRoomName(asset.roomID)}
                        </span>
                        {(asset.productionLineNames || []).map((lineName) => (
                          <span
                            key={`${asset.roomAssetID}-line-${lineName}`}
                            className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                          >
                            {t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}: {lineName}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedAsset ? (
              <div className="col-span-2 pl-4">
                <div className="mb-4 pb-4 border-b dark:border-gray-700">
                  <h4 className="font-semibold mb-2 dark:text-white">{t(K.ADMIN_TABLE_ASSET_DETAILS, "Asset Details")}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Asset Code</p>
                      <div className="font-medium dark:text-white">
                        {selectedAsset.assetID ? (
                          <EntityPill
                            type="asset"
                            id={selectedAsset.assetID}
                            label={selectedAsset.assetCode || t(K.ADMIN_TABLE_NA, "N/A")}
                          />
                        ) : (selectedAsset.assetCode || t(K.ADMIN_TABLE_NA, "N/A"))}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Serial Number</p>
                      <div className="font-medium dark:text-white">
                        {selectedAsset.assetID ? (
                          <EntityPill
                            type="asset"
                            id={selectedAsset.assetID}
                            label={selectedAsset.serialNumber || t(K.ADMIN_TABLE_NA, "N/A")}
                            modalData={{
                              serialNumber: selectedAsset.serialNumber || null,
                              assetStatus: selectedAsset.assetStatus || selectedAsset.status || null,
                              roomAssetID: selectedAsset.roomAssetID || null,
                              roomID: selectedAsset.roomID || null,
                              roomName: selectedAsset.roomName || getRoomName(selectedAsset.roomID),
                              condition: selectedAsset.condition || null,
                              operationalStatus: selectedAsset.operationalStatus || null,
                              enableRoomAssetIssueReport: true,
                            }}
                          />
                        ) : (selectedAsset.serialNumber || t(K.ADMIN_TABLE_NA, "N/A"))}
                      </div>
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
                      <p className="text-gray-600 dark:text-gray-400 mb-1">{t(K.ADMIN_TABLE_PRODUCTION_LINE, "Production Line")}</p>
                      <p className="font-medium dark:text-white">
                        {selectedAsset.productionLineNames?.length > 0
                          ? selectedAsset.productionLineNames.join(", ")
                          : t(K.ADMIN_TABLE_NA, "N/A")}
                      </p>
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
            ) : (
              <div className="col-span-2 flex items-center justify-center text-gray-400 dark:text-gray-600">
                <p>{t(K.ADMIN_TABLE_SELECT_ASSET, "Select an asset to view details")}</p>
              </div>
            )}
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
    </Card>
  );
}

