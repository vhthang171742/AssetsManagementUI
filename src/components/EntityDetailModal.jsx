import React, { useCallback, useEffect, useState } from "react";
import Modal from "components/modal/Modal";
import assetService from "services/assetService";
import { classService, courseService, departmentService, productionLineService, roomService, userService } from "services/api";
import { studentEquipmentAssignmentService } from "services/api";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { RoleSets } from "constants/authorization";

/**
 * EntityDetailModal - Read-only detail modal for various entity types.
 * Shows an "Edit" button for Admin portal users.
 *
 * Supported types: asset, class, student, user, course, department, room, instructor, technician, worker, productionLine
 *
 * @param {string} type           - The entity type
 * @param {string|number} id      - Entity primary ID
 * @param {function} onClose      - Close callback
 * @param {object} [modalData]    - Optional context data (serial/status/etc)
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
        // Fetch all assignments for the student
        const assignments = await studentEquipmentAssignmentService.getByStudent(id);
        // Only use the current active assignment (UnassignedDate == null)
        const activeAssignment = assignments && assignments.length > 0
          ? assignments.find(a => !a.unassignedDate)
          : null;
        if (activeAssignment) {
          result = {
            studentCode: activeAssignment.studentCode,
            fullName: activeAssignment.studentName,
            studentID: activeAssignment.studentID,
          };
        } else if (assignments && assignments.length > 0) {
          // fallback: show the most recent assignment if none are active
          result = {
            studentCode: assignments[0].studentCode,
            fullName: assignments[0].studentName,
            studentID: assignments[0].studentID,
          };
        } else {
          result = { studentID: id };
        }
      } else if (type === "course") {
        result = await courseService.getById(id);
      } else if (type === "department") {
        result = await departmentService.getById(id);
      } else if (type === "room") {
        result = await roomService.getById(id);
      } else if (type === "productionLine") {
        result = await productionLineService.getById(id);
      } else if (["user", "instructor", "technician", "worker"].includes(type)) {
        // All user-based types can use userService
        result = await userService.getById(id);
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

  const titleKey = {
    asset: K.PILL_ASSET_DETAILS,
    class: K.PILL_CLASS_DETAILS,
    student: K.PILL_STUDENT_DETAILS,
    user: K.PILL_USER_DETAILS,
    course: K.PILL_COURSE_DETAILS,
    department: K.PILL_DEPARTMENT_DETAILS,
    room: K.PILL_ROOM_DETAILS,
    instructor: K.PILL_INSTRUCTOR_DETAILS,
    technician: K.PILL_TECHNICIAN_DETAILS,
    worker: K.PILL_WORKER_DETAILS,
    productionLine: K.PILL_DETAILS,
  }[type] || K.PILL_DETAILS;

  const defaultTitle = {
    asset: "Asset details",
    class: "Class details",
    student: "Student details",
    user: "User details",
    course: "Course details",
    department: "Department details",
    room: "Room details",
    instructor: "Instructor details",
    technician: "Technician details",
    worker: "Worker details",
    productionLine: "Production line details",
  }[type] || "Details";

  // Admin edit links (open admin portal in same tab)
  const getAdminEditPath = () => {
    const pathMap = {
      asset: "/admin/assets",
      class: "/admin/classes",
      student: "/admin/studentEquipmentAssignments",
      course: "/admin/courses",
      department: "/admin/departments",
      room: "/admin/rooms",
      user: "/admin/users",
      instructor: "/admin/instructors",
      technician: "/admin/technicians",
      worker: "/admin/workers",
      productionLine: "/admin/production-lines",
    };
    return pathMap[type] || "/admin";
  };

  const renderField = (label, value) => {
    if (value == null || value === "") return null;
    return (
      <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-800/60">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        <span className="block break-all text-sm font-semibold leading-5 text-gray-800 dark:text-gray-200">{String(value)}</span>
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

    if (type === "course") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.courseCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.courseName)}
          {renderField(t(K.PILL_FIELD_DESCRIPTION, "Description"), data.description)}
        </div>
      );
    }

    if (type === "department") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.departmentCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.departmentName)}
          {renderField(t(K.PILL_FIELD_DESCRIPTION, "Description"), data.description)}
        </div>
      );
    }

    if (type === "room") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.roomName)}
          {renderField(t(K.PILL_FIELD_CAPACITY, "Capacity"), data.capacity)}
          {renderField(t(K.PILL_FIELD_BUILDING, "Building"), data.building)}
        </div>
      );
    }

    if (type === "productionLine") {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.lineCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.lineName)}
          {renderField(t(K.PILL_FIELD_DEPARTMENT, "Department"), data.departmentName || data.department?.departmentName)}
          {renderField(t(K.ADMIN_TABLE_ORDER_CODE, "Order Code"), data.orderCode)}
          {renderField(t(K.PILL_FIELD_CAPACITY, "Capacity"), data.capacity)}
          {renderField(t(K.PILL_FIELD_STATUS, "Status"), data.isActive == null ? null : (data.isActive ? t(K.ADMIN_TABLE_ACTIVE, "Active") : t(K.ADMIN_TABLE_INACTIVE, "Inactive")))}
        </div>
      );
    }

    if (["user", "instructor", "technician", "worker"].includes(type)) {
      return (
        <div className="grid grid-cols-2 gap-4">
          {renderField(t(K.PILL_FIELD_EMAIL, "Email"), data.email)}
          {renderField(t(K.PILL_FIELD_FULL_NAME, "Full name"), data.fullName)}
          {renderField(t(K.PILL_FIELD_PHONE, "Phone"), data.phoneNumber)}
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.code || data.employeeCode || data.instructorCode || data.technicianCode)}
        </div>
      );
    }

    return null;
  };

  const extraContent = typeof modalData?.renderExtraContent === "function"
    ? modalData.renderExtraContent({ data, onClose })
    : modalData?.renderExtraContent || null;

  const customFooterActions = typeof modalData?.footerActions === "function"
    ? modalData.footerActions({ onClose })
    : modalData?.footerActions || null;

  // Only show Edit button if it navigates to a different page
  const editPath = getAdminEditPath();
  const currentPath = window.location.pathname;
  const shouldShowEditButton = isAdmin && editPath !== currentPath;

  const adminEditAction = shouldShowEditButton ? (
    <a
      href={editPath}
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
      <div className="space-y-6">
        {renderContent()}
        {extraContent}
      </div>
    </Modal>
  );
}
