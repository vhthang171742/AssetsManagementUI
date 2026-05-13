import React, { useCallback, useEffect, useState } from "react";
import Modal from "components/modal/Modal";
import EntityPill from "components/EntityPill";
import RoomPill from "components/RoomPill";
import RoomAssetIssueReporter from "components/roomAsset/RoomAssetIssueReporter";
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
  const [roomAssets, setRoomAssets] = useState([]);
  const [roomAssetData, setRoomAssetData] = useState(null);

  const isAdmin = hasAnyRole(RoleSets.Admin);
  const reportableRoomAssetId = modalData?.enableRoomAssetIssueReport
    ? (modalData?.roomAssetID ?? modalData?.roomAssetId ?? null)
    : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result = null;
      if (type === "asset") {
        const fetchAsset = assetService.getById(id);
        // If a specific room-asset unit is referenced, also fetch room assets to get
        // per-unit condition and operational status
        const raRoomId = modalData?.roomID ?? modalData?.roomId ?? null;
        const raId = modalData?.roomAssetID ?? modalData?.roomAssetId ?? null;
        if (raRoomId && raId) {
          const [assetResult, roomAssetList] = await Promise.all([
            fetchAsset,
            roomService.getAssets(raRoomId),
          ]);
          result = assetResult;
          const found = (roomAssetList || []).find((ra) => ra.roomAssetID === raId);
          setRoomAssetData(found || null);
        } else {
          result = await fetchAsset;
          setRoomAssetData(null);
        }
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
        const [roomResult, roomAssetResult] = await Promise.all([
          roomService.getById(id),
          roomService.getAssets(id),
        ]);
        result = roomResult;
        setRoomAssets(roomAssetResult || []);
      } else if (type === "productionLine") {
        result = await productionLineService.getById(id);
      } else if (["user", "instructor", "technician", "worker"].includes(type)) {
        // All user-based types can use userService
        result = await userService.getById(id);
      }
      if (type !== "room") {
        setRoomAssets([]);
      }
      setData(result);
    } catch (err) {
      setError(t(K.PILL_LOAD_ERROR, "Failed to load details"));
      if (type === "room") {
        setRoomAssets([]);
      }
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

  const renderField = (label, value, className = "") => {
    if (value == null || value === "") return null;
    return (
      <div className={`min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-navy-800/60 ${className}`.trim()}>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        {React.isValidElement(value)
          ? <div className="block text-sm font-semibold leading-5 text-gray-800 dark:text-gray-200">{value}</div>
          : <span className="block break-all text-sm font-semibold leading-5 text-gray-800 dark:text-gray-200">{String(value)}</span>}
      </div>
    );
  };

  const renderRoomAssetIssueSection = () => {
    if (!reportableRoomAssetId) {
      return null;
    }

    return <RoomAssetIssueReporter roomAssetId={reportableRoomAssetId} descriptionRows={2} compact />;
  };

  const renderContent = () => {
    if (loading) return <p className="text-sm text-gray-500">{t(K.PILL_LOADING, "Loading...")}</p>;
    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!data) return null;

    if (type === "asset") {
      const roomId = modalData?.roomID ?? modalData?.roomId ?? roomAssetData?.roomID ?? data.roomID ?? null;
      const roomLabel = modalData?.roomCode || modalData?.roomName || roomAssetData?.roomName || data.roomCode || data.roomName || null;
      const serialNumber = modalData?.serialNumber || roomAssetData?.serialNumber || data.serialNumber;
      const status = modalData?.assetStatus || data.assetStatus || data.status;
      const condition = modalData?.condition || roomAssetData?.condition || data.condition;
      const operationalStatus = modalData?.operationalStatus || roomAssetData?.operationalStatus || data.operationalStatus;

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {renderField(t(K.PILL_FIELD_CODE, "Code"), data.assetCode)}
            {renderField(t(K.PILL_FIELD_NAME, "Name"), data.assetName)}
            {renderField(t(K.PILL_FIELD_CATEGORY, "Category"), data.categoryName || data.category?.categoryName)}
            {renderField(t(K.PILL_FIELD_BRAND, "Brand"), data.brand)}
            {renderField(t(K.PILL_FIELD_MODEL, "Model"), data.model)}
            {renderField(t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number"), serialNumber)}
            {renderField(t(K.PILL_FIELD_ROOM, "Room"), roomLabel
              ? <RoomPill roomId={roomId} label={roomLabel} roomName={modalData?.roomName || roomAssetData?.roomName || data.roomName || roomLabel} roomCode={modalData?.roomCode || data.roomCode || null} />
              : null, "md:col-span-2")}
            {renderField(t("COMMON_CONDITION", "Condition"), condition)}
            {renderField(t("COMMON_OPERATIONAL_STATUS", "Operational Status"), operationalStatus)}
          </div>
          {renderRoomAssetIssueSection()}
        </div>
      );
    }

    if (type === "class") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField(t(K.PILL_FIELD_STUDENT_CODE, "Student code"), data.studentCode)}
          {renderField(t(K.PILL_FIELD_FULL_NAME, "Full name"), data.fullName || data.studentName)}
        </div>
      );
    }

    if (type === "course") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.courseCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.courseName)}
          {renderField(t(K.PILL_FIELD_DESCRIPTION, "Description"), data.description)}
        </div>
      );
    }

    if (type === "department") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField(t(K.PILL_FIELD_CODE, "Code"), data.departmentCode)}
          {renderField(t(K.PILL_FIELD_NAME, "Name"), data.departmentName)}
          {renderField(t(K.PILL_FIELD_DESCRIPTION, "Description"), data.description)}
        </div>
      );
    }

    if (type === "room") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderField(t(K.PILL_FIELD_NAME, "Name"), data.roomName, "md:col-span-2")}
            {renderField(t(K.PILL_FIELD_CAPACITY, "Capacity"), data.capacity)}
            {renderField(t(K.PILL_FIELD_BUILDING, "Building"), data.building)}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-navy-900">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-navy-700 dark:text-white">
                {t("ROOM_ASSET_LIST_TITLE", "Assets in this room")}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-300">
                {(roomAssets || []).length}
              </span>
            </div>

            {(roomAssets || []).length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">
                {t("ROOM_ASSET_LIST_EMPTY", "No assets are currently assigned to this room.")}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {(roomAssets || []).map((asset) => (
                  <div key={asset.roomAssetID || asset.assetID} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-navy-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityPill
                        type="asset"
                        id={asset.assetID}
                        label={asset.assetCode || asset.assetName || `Asset #${asset.roomAssetID || asset.assetID}`}
                      />
                      {asset.serialNumber && (
                        <EntityPill
                          type="asset"
                          id={asset.assetID}
                          label={`SN ${asset.serialNumber}`}
                          modalData={{
                            serialNumber: asset.serialNumber || null,
                            assetStatus: asset.assetStatus || asset.status || null,
                            roomAssetID: asset.roomAssetID || null,
                            roomID: asset.roomID || id,
                            roomName: asset.roomName || data.roomName || null,
                            roomCode: data.roomCode || null,
                            condition: asset.condition || null,
                            operationalStatus: asset.operationalStatus || null,
                            enableRoomAssetIssueReport: true,
                          }}
                        />
                      )}
                    </div>

                    {(asset.condition || asset.operationalStatus) && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                        {[asset.condition, asset.operationalStatus].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "productionLine") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      maxWidth={reportableRoomAssetId || type === "room" ? "max-w-2xl" : "max-w-lg"}
      maxHeight={reportableRoomAssetId ? "max-h-[96vh]" : "max-h-[90vh]"}
    >
      <div className="space-y-6 overflow-x-hidden">
        {renderContent()}
        {extraContent}
      </div>
    </Modal>
  );
}
