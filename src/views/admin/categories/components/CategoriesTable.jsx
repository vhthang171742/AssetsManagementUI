import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { assetCategoryService } from "services/api";
import Card from "components/card";
import Table from "components/table/Table";
import { MdModeEditOutline, MdDelete } from "react-icons/md";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function CategoriesTable() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("categoryName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
  });

  useEffect(() => {
    fetchCategories();
  }, [page, pageSize, debouncedSearch, sortBy, sortDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await assetCategoryService.getPaged({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortDirection,
      });
      setCategories(data?.items || []);
      setTotalCount(data?.totalCount || 0);

      if (data?.totalPages && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error(`${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_CATEGORIES, "categories")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
    } finally {
      setLoading(false);
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
        await assetCategoryService.update(editingId, formData);
        toast.success(`${t(K.ADMIN_TABLE_CATEGORY, "Category")} ${t(K.ADMIN_TABLE_UPDATED_SUCCESSFULLY, "updated successfully")}`);
      } else {
        await assetCategoryService.create(formData);
        toast.success(`${t(K.ADMIN_TABLE_CATEGORY, "Category")} ${t(K.ADMIN_TABLE_CREATED_SUCCESSFULLY, "created successfully")}`);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        categoryName: "",
        description: "",
      });
      fetchCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      const details = error.errors?.length ? "\n\u2022 " + error.errors.join("\n\u2022 ") : "";
      toast.error(`${t(K.ADMIN_TABLE_SAVE_FAILED, "Failed to save")} ${t(K.ADMIN_TABLE_CATEGORY, "category")}: ${error.message}${details}`);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      categoryName: category.categoryName,
      description: category.description,
    });
    setEditingId(category.categoryID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t(K.ADMIN_TABLE_CONFIRM_DELETE_CATEGORY, "Are you sure you want to delete this category?"))) {
      try {
        await assetCategoryService.delete(id);
        toast.success(`${t(K.ADMIN_TABLE_CATEGORY, "Category")} ${t(K.ADMIN_TABLE_DELETED_SUCCESSFULLY, "deleted successfully")}`);
        fetchCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
        toast.error(`${t(K.ADMIN_TABLE_DELETE_FAILED, "Failed to delete")} ${t(K.ADMIN_TABLE_CATEGORY, "category")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      }
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      await assetCategoryService.bulkDelete(ids);
      toast.success(`${t(K.ADMIN_TABLE_DELETED_SELECTED, "Deleted selected")} ${t(K.ADMIN_TABLE_CATEGORIES, "categories")}`);
      fetchCategories();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(`${t(K.ADMIN_TABLE_DELETE_SELECTED_FAILED, "Failed to delete selected")} ${t(K.ADMIN_TABLE_CATEGORIES, "categories")}: ${err.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`);
      throw err;
    }
  };

  return (
    <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              categoryName: "",
              description: "",
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          {`${t(K.ADMIN_TABLE_ADD, "Add")} ${t(K.ADMIN_TABLE_CATEGORY, "Category")}`}
        </button>
        <input
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1);
          }}
          placeholder={t(K.ADMIN_TABLE_SEARCH_NAME_DESCRIPTION, "Search name, description")}
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white md:w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</div>
      ) : (
        <Table
          data={categories}
          onBulkDelete={handleBulkDelete}
          selectable={true}
          idField="categoryID"
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
            { header: t(K.ADMIN_TABLE_CATEGORY_NAME, "Category Name"), accessor: 'categoryName', sortKey: "categoryName" },
            { header: t(K.ADMIN_TABLE_DESCRIPTION, "Description"), accessor: 'description', sortKey: "description" },
            {
              header: t(K.ADMIN_TABLE_ACTIONS, "Actions"),
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
                    onClick={() => handleDelete(row.categoryID)}
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
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? `${t(K.ADMIN_TABLE_EDIT, "Edit")} ${t(K.ADMIN_TABLE_CATEGORY, "Category")}` : `${t(K.ADMIN_TABLE_ADD_NEW, "Add New")} ${t(K.ADMIN_TABLE_CATEGORY, "Category")}`}
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
                form="categoryForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="categoryForm" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 dark:text-white">{t(K.ADMIN_TABLE_CATEGORY_NAME, "Category Name")}</label>
              <input
                type="text"
                name="categoryName"
                placeholder={t(K.ADMIN_TABLE_CATEGORY_NAME, "Category Name")}
                value={formData.categoryName}
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
                rows="4"
              />
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

