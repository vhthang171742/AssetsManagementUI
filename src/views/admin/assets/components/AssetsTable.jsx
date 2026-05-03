import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getData as getCountryData } from "country-list";
import { assetService, assetCategoryService } from "services/api";
import { dropdownService } from "services/dropdownService";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function AssetsTable() {
  const { t } = useLanguage();
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    quantity: 0,
    unit: "",
    status: "",
    unitPrice: "",
    purchaseDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchStatuses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchAssets();
  }, [page, pageSize, debouncedSearch, categoryFilter, statusFilter, sortBy, sortDirection]);

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
        status: statusFilter || undefined,
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

  const fetchStatuses = async () => {
    try {
      const data = await dropdownService.getEquipmentStatus();
      setStatuses(data || []);
    } catch (error) {
      console.error("Failed to fetch statuses:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "unitPrice" ? parseFloat(value) || "" : value,
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
        quantity: 0,
        unit: "",
        status: "",
        unitPrice: "",
        purchaseDate: "",
        notes: "",
      });
      fetchAssets();
    } catch (error) {
      console.error("Failed to save asset:", error);
      const details = error.errors?.length ? "\n• " + error.errors.join("\n• ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_ASSET, "asset")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (asset) => {
    setFormData(asset);
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
              quantity: 0,
              unit: "",
              status: "",
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

        <div className="grid w-full gap-2 sm:grid-cols-3 md:max-w-3xl">
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
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{`${t(K.ADMIN_TABLE_ALL, "All")} ${t(K.ADMIN_TABLE_STATUSES, "Statuses")}`}</option>
            {statuses.map((status) => (
              <option key={status.itemCode} value={status.itemCode}>
                {status.label}
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
            { header: t(K.ADMIN_TABLE_CODE, 'Code'), accessor: 'assetCode', sortKey: "assetCode" },
            { header: t(K.ADMIN_TABLE_NAME, 'Name'), accessor: 'assetName', sortKey: "assetName" },
            { header: t(K.ADMIN_TABLE_CATEGORY, 'Category'), accessor: 'categoryID', sortKey: "categoryName", render: (row) => getCategoryName(row.categoryID) },
            { header: t(K.ADMIN_TABLE_STATUS, 'Status'), accessor: 'status', sortKey: "status", render: (row) => row.status || t(K.ADMIN_TABLE_NA, 'N/A') },
            { header: t(K.ADMIN_TABLE_BRAND, 'Brand'), accessor: 'brand', sortKey: "brand" },
            { header: t(K.ADMIN_TABLE_QUANTITY, 'Quantity'), accessor: 'quantity', sortKey: "quantity" },
            { header: t(K.ADMIN_TABLE_UNIT_PRICE, 'Unit Price'), accessor: 'unitPrice', sortKey: "unitPrice", render: (row) => (row.unitPrice != null ? `$${parseFloat(row.unitPrice).toFixed(2)}` : '') },
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
                <input
                  type="number"
                  name="quantity"
                  placeholder={t(K.ADMIN_TABLE_QUANTITY, "Quantity")}
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
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
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="col-span-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{t(K.ADMIN_TABLE_SELECT_STATUS_OPTIONAL, "Select Status (Optional)")}</option>
                  {statuses.map((status) => (
                    <option key={status.itemCode} value={status.itemCode}>
                      {status.label}
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
    </Card>
  );
}

