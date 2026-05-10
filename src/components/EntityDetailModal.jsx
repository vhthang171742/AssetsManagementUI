import React, { useCallback, useEffect, useState } from "react";
import Modal from "components/modal/Modal";
import assetService from "services/assetService";
import { classService } from "services/api";
import { studentEquipmentAssignmentService } from "services/api";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { RoleSets } from "constants/authorization";

/**
 * EntityDetailModal - Read-only detail modal for Asset, Class, or Student entities.
 * Shows an "Edit" button only for Admin portal users.
 *
 * @param {"asset"|"class"|"student"} type - The entity type
 * @param {string|number} id              - Entity primary ID
 * @param {function} onClose              - Close callback
 * @param {object} [modalData]            - Optional context data (serial/status)
 */
export default function EntityDetailModal({ type, id, onClose, modalData = null }) {
  const { t } = useLanguage();
  const { hasAnyRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = hasAnyRole(RoleSets.Admin);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result = null;
      if (type === "asset") {
        result = await assetService.getById(id);
      } else if (type === "class") {
        result = await classService.getById(id);
      } else if (type === "student") {
        // We fetch the assignment by student ID (studentID) to get student name/code
        // The id here is studentID from the assignment
        const assignments = await studentEquipmentAssignmentService.getByStudent(id);
        if (assignments && assignments.length > 0) {
          result = {
            studentCode: assignments[0].studentCode,
            fullName: assignments[0].studentName,
            studentID: assignments[0].studentID,
          };
        } else {
          result = { studentID: id };
        }
      }
      setData(result);
    } catch (err) {
      setError(t(K.PILL_LOAD_ERROR, "Failed to load details"));
    } finally {
      setLoading(false);
    }
  }, [type, id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const titleKey = type === "asset" ? K.PILL_ASSET_DETAILS : type === "class" ? K.PILL_CLASS_DETAILS : K.PILL_STUDENT_DETAILS;
  const defaultTitle = type === "asset" ? "Asset details" : type === "class" ? "Class details" : "Student details";

  // Admin edit links (open admin portal in same tab)
  const getAdminEditPath = () => {
    if (type === "asset") return `/admin/assets`;
    if (type === "class") return `/admin/classes`;
    return `/admin/studentEquipmentAssignments`;
  };

  const renderField = (label, value) => {
    if (value == null || value === "") return null;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{String(value)}</span>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <p className="text-sm text-gray-500">{t(K.PILL_LOADING, "Loading...")}</p>;
    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!data) return null;

    if (type === "asset") {
      const serialNumber = modalData?.serialNumber || data.serialNumber;
      const status = modalData?.assetStatus || data.assetStatus || data.status;

      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.assetCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.assetName)}
          {renderField(t(K.PILL_FIELD_CATEGORY, "Category"), data.categoryName || data.category?.categoryName)}
          {renderField(t(K.PILL_FIELD_BRAND, "Brand"), data.brand)}
          {renderField(t(K.PILL_FIELD_MODEL, "Model"), data.model)}
          {renderField(t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number"), serialNumber)}
          {renderField(t(K.PILL_FIELD_STATUS, "Status"), status)}
        </div>
      );
    }

    if (type === "class") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.classCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.className)}
          {renderField(t(K.PILL_FIELD_COURSE, "Course"), data.courseName || data.course?.courseName)}
          {renderField(t(K.PILL_FIELD_INSTRUCTOR, "Instructor"), data.instructorName)}
          {renderField(t(K.PILL_FIELD_ROOM, "Room"), data.roomName)}
          {renderField(t(K.PILL_FIELD_START_DATE, "Start date"), data.startDate ? new Date(data.startDate).toLocaleDateString() : null)}
          {renderField(t(K.PILL_FIELD_END_DATE, "End date"), data.endDate ? new Date(data.endDate).toLocaleDateString() : null)}
        </div>
      );
    }

    if (type === "student") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_STUDENT_CODE, "Student code"), data.studentCode)}
          {renderField(t(K.PILL_FIELD_FULL_NAME, "Full name"), data.fullName || data.studentName)}
        </div>
      );
    }

    return null;
  };

  const customFooterActions = typeof modalData?.footerActions === "function"
    ? modalData.footerActions({ onClose })
    : modalData?.footerActions || null;

  const adminEditAction = isAdmin ? (
    <a
      href={getAdminEditPath()}
      className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
    >
      {t(K.PILL_EDIT, "Edit")}
    </a>
  ) : null;

  const footer = (customFooterActions || adminEditAction) ? (
    <>
      {customFooterActions}
      {adminEditAction}
    </>
  ) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t(titleKey, defaultTitle)}
      footer={footer}
      maxWidth="max-w-lg"
    >
      {renderContent()}
    </Modal>
  );
}
