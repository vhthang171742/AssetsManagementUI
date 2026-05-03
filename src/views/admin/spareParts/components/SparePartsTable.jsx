import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { sparePartService } from "services/api";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete, MdWarning } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function SparePartsTable() {
  const { t } = useLanguage();
  const [parts, setParts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("partCode");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    partName: "",
    partCode: "",
    manufacturer: "",
    compatibleMachineTypes: "",
    unitPrice: "",
    stockQuantity: "",
    reorderLevel: "",
    isActive: true,
  });

  useEffect(() => {
    fetchParts();
  }, [page, pageSize, debouncedSearch, activeFilter, sortBy, sortDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const data = await sparePartService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setParts(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ROUTE_SPARE_PARTS, "spare parts")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : 
              name === "stockQuantity" || name === "reorderLevel" ? parseInt(value) || "" :
              name === "unitPrice" ? parseFloat(value) || "" : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await sparePartService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_PART, "Part")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await sparePartService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_PART, "Part")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchParts();
    } catch (error) {
      console.error("Failed to save part:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_PART, "part")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (part) => {
    setFormData({
      partName: part.partName,
      partCode: part.partCode,
      manufacturer: part.manufacturer || "",
      compatibleMachineTypes: part.compatibleMachineTypes || "",
      unitPrice: part.unitPrice || "",
      stockQuantity: part.stockQuantity,
      reorderLevel: part.reorderLevel,
      isActive: part.isActive,
    });
    setEditingId(part.partID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_PART, "Are you sure you want to delete this part?"))) {
      try {
        await sparePartService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_PART, "Part")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchParts();
      } catch (error) {
        console.error("Failed to delete part:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_PART, "part")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await sparePartService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_PARTS, "parts")}`);
      fetchParts();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_PARTS, "parts")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  const resetForm = () => {
    setFormData({
      partName: "",
      partCode: "",
      manufacturer: "",
      compatibleMachineTypes: "",
      unitPrice: "",
      stockQuantity: "",
      reorderLevel: "",
      isActive: true,
    });
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
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ROUTE_SPARE_PARTS, "Spare Part")}`}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row md:max-w-lg">
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder={t(K.ADMIN_TABLE_SEARCH_CODE_NAME_MANUFACTURER, "Search code, name, manufacturer")}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
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
          data={parts}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="partID"
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
            { header: t(K.ADMIN_TABLE_PART_CODE, 'Part Code'), accessor: 'partCode', sortKey: "partCode" },
            { header: t(K.ADMIN_TABLE_PART_NAME, 'Part Name'), accessor: 'partName', sortKey: "partName" },
            { header: t(K.ADMIN_TABLE_MANUFACTURER, 'Manufacturer'), accessor: 'manufacturer', sortKey: "manufacturer", render: (row) => row.manufacturer || t(K.ADMIN_TABLE_NA, 'N/A') },
            { 
              header: t(K.ADMIN_TABLE_STOCK, 'Stock'), 
              accessor: 'stockQuantity',
              sortKey: "stockQuantity",
              render: (row) => (
                <span className={row.needsReorder ? 'text-red-600 font-bold flex items-center gap-1' : ''}>
                  {row.needsReorder && <MdWarning className="h-4 w-4" />}
                  {row.stockQuantity}
                </span>
              )
            },
            { header: t(K.ADMIN_TABLE_REORDER_LEVEL, 'Reorder Level'), accessor: 'reorderLevel', sortKey: "reorderLevel" },
            { header: t(K.ADMIN_TABLE_UNIT_PRICE, 'Unit Price'), accessor: 'unitPrice', sortKey: "unitPrice", render: (row) => row.unitPrice != null ? `$${parseFloat(row.unitPrice).toFixed(2)}` : t(K.ADMIN_TABLE_NA, 'N/A') },
            { header: t(K.ADMIN_TABLE_ACTIVE, 'Active'), accessor: 'isActive', sortKey: "isActive", render: (row) => row.isActive ? '✓' : '✗' },
            {
              header: t(K.ADMIN_TABLE_ACTIONS, 'Actions'),
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
                    onClick={() => handleDelete(row.partID)}
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
          title={editingId ? t(K.ADMIN_TABLE_EDIT_SPARE_PART, "Edit Spare Part") : t(K.ADMIN_TABLE_ADD_NEW_SPARE_PART, "Add New Spare Part")}
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
                form="partForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="partForm" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                name="partCode"
                placeholder={t(K.ADMIN_TABLE_PART_CODE, "Part Code")}
                value={formData.partCode}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
              <input
                type="text"
                name="partName"
                placeholder={t(K.ADMIN_TABLE_PART_NAME, "Part Name")}
                value={formData.partName}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
              
              <input
                type="text"
                name="manufacturer"
                placeholder={t(K.ADMIN_TABLE_MANUFACTURER_OPTIONAL, "Manufacturer (Optional)")}
                value={formData.manufacturer}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <input
                type="text"
                name="compatibleMachineTypes"
                placeholder={t(K.ADMIN_TABLE_COMPATIBLE_MACHINE_TYPES, "Compatible Machine Types (comma-separated)")}
                value={formData.compatibleMachineTypes}
                onChange={handleInputChange}
                className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />

              <input
                type="number"
                name="stockQuantity"
                placeholder={t(K.ADMIN_TABLE_STOCK_QUANTITY, "Stock Quantity")}
                value={formData.stockQuantity}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <input
                type="number"
                name="reorderLevel"
                placeholder={t(K.ADMIN_TABLE_REORDER_LEVEL, "Reorder Level")}
                value={formData.reorderLevel}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />

              <input
                type="number"
                name="unitPrice"
                placeholder={t(K.ADMIN_TABLE_UNIT_PRICE, "Unit Price")}
                value={formData.unitPrice}
                onChange={handleInputChange}
                className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                step="0.01"
              />

              <div className="col-span-1 flex items-center">
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

