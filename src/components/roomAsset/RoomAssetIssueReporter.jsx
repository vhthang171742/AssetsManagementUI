import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import dropdownService from "services/dropdownService";
import { assetLifecycleService } from "services/assetLifecycleService";
import { useLanguage } from "context/LanguageContext";

export default function RoomAssetIssueReporter({
  roomAssetId,
  containerClassName = "rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-navy-900",
  descriptionRows = 4,
  compact = false,
}) {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.itemCode === form.category) || null,
    [categories, form.category],
  );

  useEffect(() => {
    if (!roomAssetId) {
      setCategories([]);
      return;
    }

    let active = true;
    dropdownService.getFailureCategories(language)
      .then((items) => {
        if (active) {
          setCategories(items || []);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, [language, roomAssetId]);

  useEffect(() => {
    setForm({ category: "", description: "" });
  }, [roomAssetId]);

  if (!roomAssetId) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.description.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await assetLifecycleService.reportRoomAssetIssue(roomAssetId, {
        category: selectedCategory?.label || selectedCategory?.itemCode || form.category || null,
        description: form.description.trim(),
      });
      toast.success(t("ROOM_ASSET_REPORT_ISSUE_SUCCESS", "Issue reported successfully."));
      setForm({ category: "", description: "" });
    } catch (error) {
      toast.error(`${t("ROOM_ASSET_REPORT_ISSUE_FAILED", "Failed to report issue")}: ${error.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={compact ? `rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-900` : containerClassName}>
      <div className={compact ? "" : "space-y-1"}>
        <h4 className="text-sm font-semibold text-navy-700 dark:text-white">
          {t("ROOM_ASSET_REPORT_ISSUE_TITLE", "Report issue")}
        </h4>
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-300">
            {t("ROOM_ASSET_REPORT_ISSUE_HINT", "Create a maintenance issue for this room asset without requiring an active session.")}
          </p>
        )}
      </div>

      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <select
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
        >
          <option value="">{t("ROOM_ASSET_REPORT_ISSUE_CATEGORY", "Select issue category")}</option>
          {categories.map((category) => (
            <option key={category.itemID || category.itemCode} value={category.itemCode}>
              {category.label || category.itemCode}
            </option>
          ))}
        </select>

        <textarea
          rows={descriptionRows}
          required
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder={t("ROOM_ASSET_REPORT_ISSUE_DESCRIPTION", "Describe the issue")}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-navy-800"
        />

        <button
          type="submit"
          disabled={submitting || !form.description.trim()}
          className="w-full rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {submitting
            ? t("ROOM_ASSET_REPORT_ISSUE_SUBMITTING", "Submitting...")
            : t("ROOM_ASSET_REPORT_ISSUE_SUBMIT", "Submit issue")}
        </button>
      </form>
    </div>
  );
}
