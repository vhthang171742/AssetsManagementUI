import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { configurationService } from "services/configurationService";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { MdModeEditOutline, MdDelete, MdAdd } from "react-icons/md";

/**
 * ConfigurationPanel — Admin view for managing configuration categories and items.
 * Supports CRUD for categories/items and bilingual translations (en-US / vi-VN).
 */
export default function ConfigurationPanel() {
  const { language, languages, t } = useLanguage();

  // Categories
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Items for selected category
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    categoryCode: "",
    categoryName: "",
    description: "",
  });

  // Item form (with translations)
  const [itemForm, setItemForm] = useState({
    itemCode: "",
    translations: {},
  });

  // ── Fetch categories ─────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await configurationService.getCategories();
      setCategories(data || []);
      // Auto-select first if nothing selected
      if (!selectedCategory && data?.length > 0) {
        setSelectedCategory(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      toast.error(t(K.CONFIG_FETCH_CATEGORIES_FAILED, "Failed to fetch categories: {error}").replace("{error}", err.message));
    } finally {
      setLoadingCategories(false);
    }
  }, [selectedCategory]);

  // ── Fetch items for selected category ─────────────────────────
  const fetchItems = useCallback(async () => {
    if (!selectedCategory) return;
    setLoadingItems(true);
    try {
      const data = await configurationService.getItems(
        selectedCategory.categoryCode,
        language
      );
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedCategory, language]);

  useEffect(() => {
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Category CRUD ─────────────────────────────────────────────
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await configurationService.createCategory(categoryForm);
      toast.success(t(K.CONFIG_CATEGORY_CREATED, "Category created successfully"));
      setShowCategoryModal(false);
      setCategoryForm({ categoryCode: "", categoryName: "", description: "" });
      await fetchCategories();
    } catch (err) {
      toast.error(t(K.CONFIG_CREATE_CATEGORY_FAILED, "Failed to create category: {error}").replace("{error}", err.message));
    }
  };

  // ── Item CRUD ─────────────────────────────────────────────────
  const initTranslations = () => {
    const tr = {};
    languages
      .filter((l) => l.isActive)
      .forEach((l) => {
        tr[l.languageCode] = "";
      });
    return tr;
  };

  const openCreateItemModal = () => {
    setEditingItemId(null);
    setItemForm({ itemCode: "", translations: initTranslations() });
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setEditingItemId(item.itemID);
    // Pre-fill with current label for each language; user can edit
    const tr = {};
    languages
      .filter((l) => l.isActive)
      .forEach((l) => {
        tr[l.languageCode] = ""; // Will be overwritten by fetched data
      });
    // We only have the current language label in the list; set it
    tr[language] = item.label || "";
    setItemForm({ itemCode: item.itemCode, translations: tr });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItemId) {
        // Update translations only
        await configurationService.updateItemTranslations(editingItemId, {
          translations: itemForm.translations,
        });
        toast.success(t(K.CONFIG_TRANSLATIONS_UPDATED, "Translations updated successfully"));
      } else {
        // Create new item
        await configurationService.createItem({
          categoryID: selectedCategory.categoryID,
          itemCode: itemForm.itemCode,
          translations: itemForm.translations,
        });
        toast.success(t(K.CONFIG_ITEM_CREATED, "Item created successfully"));
      }
      setShowItemModal(false);
      fetchItems();
    } catch (err) {
      const details = err.errors?.length ? "\n\u2022 " + err.errors.join("\n\u2022 ") : "";
      toast.error(t(K.CONFIG_SAVE_ITEM_FAILED, "Failed to save item: {error}").replace("{error}", `${err.message}${details}`));
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm(t(K.CONFIG_CONFIRM_DELETE_ITEM, "Are you sure you want to delete this configuration item?"))) return;
    try {
      await configurationService.deleteItem(itemId);
      toast.success(t(K.CONFIG_ITEM_DELETED, "Item deleted"));
      fetchItems();
    } catch (err) {
      toast.error(t(K.CONFIG_DELETE_ITEM_FAILED, "Failed to delete item: {error}").replace("{error}", err.message));
    }
  };

  const handleTranslationChange = (langCode, value) => {
    setItemForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [langCode]: value },
    }));
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-4">
      {/* Left: Categories list */}
      <Card extra="col-span-1 flex h-full min-h-0 flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            {t(K.CONFIG_CATEGORIES_HEADING, "Categories")}
          </h2>
          <button
            onClick={() => {
              setCategoryForm({ categoryCode: "", categoryName: "", description: "" });
              setShowCategoryModal(true);
            }}
            className="p-1 bg-brand-500 text-white rounded hover:bg-brand-600"
            title={t(K.CONFIG_ADD_CATEGORY, "Add category")}
          >
            <MdAdd className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loadingCategories ? (
            <p className="text-sm text-gray-500">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.categoryID}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedCategory?.categoryID === cat.categoryID
                        ? "bg-brand-500 text-white"
                        : "text-navy-700 dark:text-white hover:bg-gray-100 dark:hover:bg-navy-700"
                    }`}
                  >
                    <span className="font-semibold">{cat.categoryName}</span>
                    <span className="ml-2 text-xs opacity-70">
                      {t(K.CONFIG_ITEM_COUNT, "({count} items)").replace("{count}", cat.itemCount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Right: Items for selected category */}
      <Card extra="col-span-1 flex h-full min-h-0 flex-col p-4 lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            {selectedCategory
              ? t(K.CONFIG_CATEGORY_ITEMS_HEADER, "{name} Items").replace("{name}", selectedCategory.categoryName)
              : t(K.CONFIG_SELECT_A_CATEGORY, "Select a category")}
          </h2>
          {selectedCategory && (
            <button
              onClick={openCreateItemModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white text-sm rounded hover:bg-brand-600"
            >
              <MdAdd className="h-4 w-4" /> {t(K.CONFIG_ADD_ITEM, "Add Item")}
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {loadingItems ? (
            <p className="py-4 text-sm text-gray-500">{t(K.ADMIN_TABLE_LOADING, "Loading...")}</p>
          ) : items.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">{t(K.CONFIG_NO_ITEMS, "No items in this category.")}</p>
          ) : (
            <div className="h-full min-h-0 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b dark:border-navy-600">
                    <th className="sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-gray-600 dark:bg-navy-800 dark:text-gray-300">{t(K.ADMIN_TABLE_CODE, "Code")}</th>
                    <th className="sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-gray-600 dark:bg-navy-800 dark:text-gray-300">{t(K.CONFIG_LABEL_LANGUAGE, "Label ({language})").replace("{language}", language)}</th>
                    <th className="sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-gray-600 dark:bg-navy-800 dark:text-gray-300">{t(K.CONFIG_SORT_ORDER, "Sort Order")}</th>
                    <th className="sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-gray-600 dark:bg-navy-800 dark:text-gray-300">{t(K.ADMIN_TABLE_ACTIVE, "Active")}</th>
                    <th className="sticky top-0 z-10 bg-white px-3 py-2 text-right font-semibold text-gray-600 dark:bg-navy-800 dark:text-gray-300">{t(K.ADMIN_TABLE_ACTIONS, "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.itemID}
                      className="border-b dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700"
                    >
                      <td className="px-3 py-2 font-mono text-navy-700 dark:text-white">{item.itemCode}</td>
                      <td className="px-3 py-2 text-navy-700 dark:text-white">{item.label}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-300">{item.sortOrder}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${item.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {item.isActive ? t(K.ADMIN_TABLE_YES, "Yes") : t(K.ADMIN_TABLE_NO, "No")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openEditItemModal(item)}
                            title={t(K.CONFIG_EDIT_TRANSLATIONS_TITLE, "Edit translations")}
                            className="rounded bg-blue-500 p-1.5 text-white hover:bg-blue-600"
                          >
                            <MdModeEditOutline className="h-4 w-4" />
                          </button>
                          {!selectedCategory?.isSystemDefined && (
                            <button
                              onClick={() => handleDeleteItem(item.itemID)}
                              title={t(K.ADMIN_TABLE_DELETE, "Delete")}
                              className="rounded bg-red-500 p-1.5 text-white hover:bg-red-600"
                            >
                              <MdDelete className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ── Create Category Modal ──────────────────────────── */}
      {showCategoryModal && (
        <Modal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title={t(K.CONFIG_NEW_CATEGORY, "New Category")}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="categoryForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="categoryForm" onSubmit={handleCreateCategory}>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t(K.CONFIG_CATEGORY_CODE_PLACEHOLDER, "Category Code (e.g. AssetCondition)")}
                value={categoryForm.categoryCode}
                onChange={(e) => setCategoryForm((p) => ({ ...p, categoryCode: e.target.value }))}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <input
                type="text"
                placeholder={t(K.ADMIN_TABLE_CATEGORY_NAME, "Category Name")}
                value={categoryForm.categoryName}
                onChange={(e) => setCategoryForm((p) => ({ ...p, categoryName: e.target.value }))}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <textarea
                placeholder={t(K.CONFIG_DESCRIPTION_OPTIONAL, "Description (optional)")}
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Create / Edit Item Modal ───────────────────────── */}
      {showItemModal && (
        <Modal
          isOpen={showItemModal}
          onClose={() => setShowItemModal(false)}
          title={editingItemId ? t(K.CONFIG_EDIT_TRANSLATIONS_MODAL, "Edit Translations") : t(K.CONFIG_NEW_ITEM, "New Configuration Item")}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {t(K.ADMIN_TABLE_CANCEL, "Cancel")}
              </button>
              <button
                type="submit"
                form="itemForm"
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {editingItemId ? t(K.ADMIN_TABLE_UPDATE, "Update") : t(K.ADMIN_TABLE_CREATE, "Create")}
              </button>
            </>
          }
        >
          <form id="itemForm" onSubmit={handleSaveItem}>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t(K.CONFIG_ITEM_CODE_PLACEHOLDER, "Item Code (e.g. PAIR)")}
                value={itemForm.itemCode}
                onChange={(e) => setItemForm((p) => ({ ...p, itemCode: e.target.value }))}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                disabled={!!editingItemId}
              />
              <div className="border-t pt-3 dark:border-gray-600">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  {t(K.CONFIG_TRANSLATIONS_LABEL, "Translations")}
                </p>
                {languages
                  .filter((l) => l.isActive)
                  .map((lang) => (
                    <div key={lang.languageCode} className="flex items-center gap-2 mb-2">
                      <span className="w-14 text-xs font-mono text-gray-500 dark:text-gray-400">
                        {lang.languageCode}
                      </span>
                      <input
                        type="text"
                        placeholder={t(K.CONFIG_LABEL_IN_LANGUAGE, "Label in {languageName}").replace("{languageName}", lang.languageName)}
                        value={itemForm.translations[lang.languageCode] || ""}
                        onChange={(e) => handleTranslationChange(lang.languageCode, e.target.value)}
                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
