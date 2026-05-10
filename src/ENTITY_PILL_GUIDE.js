/**
 * GUIDE: Using Entity Pills in Admin Tables
 * ==========================================
 *
 * This guide shows how to replace plain text entity references with
 * clickable pills in admin table views.
 *
 * Components:
 * - EntityPill: Clickable pill button with modal (src/components/EntityPill.jsx)
 * - EntityDetailModal: Details modal (src/components/EntityDetailModal.jsx)
 * - TableEntityPill: Table-specific wrapper (src/components/table/TableEntityPill.jsx)
 * - useEntityPillConfig: Configuration hook (src/hooks/useEntityPillConfig.js)
 *
 * ============================================================================
 */

/**
 * APPROACH 1: Using TableEntityPill (Recommended - Simplest)
 * ===========================================================
 *
 * Best for: Basic entity code display in tables
 * Effort: Minimal (just update column render function)
 *
 * Example: StudentEquipmentAssignments table
 */

// BEFORE: Plain text code
const columnsBefore = [
  {
    header: "Student Code",
    accessor: (row) => row.studentCode || row.studentID,
    sortKey: "studentCode",
  },
  {
    header: "Asset Code",
    accessor: (row) => row.assetCode || row.roomAssetID,
    sortKey: "assetCode",
  },
];

// AFTER: Using TableEntityPill
import TableEntityPill from "components/table/TableEntityPill";

const columnsAfter = [
  {
    header: "Student Code",
    accessor: (row) => row.studentCode || row.studentID,
    sortKey: "studentCode",
    render: (row) => <TableEntityPill entityType="student" row={row} />,
  },
  {
    header: "Asset Code",
    accessor: (row) => row.assetCode || row.roomAssetID,
    sortKey: "assetCode",
    render: (row) => <TableEntityPill entityType="asset" row={row} />,
  },
];

/**
 * ============================================================================
 */

/**
 * APPROACH 2: Using EntityPill Directly (More Control)
 * ====================================================
 *
 * Best for: Custom modal data or styling
 * Effort: Slightly more code but very flexible
 *
 * Example: Classes table with additional modal data
 */

import EntityPill from "components/EntityPill";

const classColumns = [
  {
    header: "Class Code",
    accessor: "classCode",
    render: (row) => (
      <EntityPill
        type="class"
        id={row.classID}
        label={row.classCode}
        modalData={{
          // Pass extra data to modal if needed
          startDate: row.startDate,
          endDate: row.endDate,
        }}
      />
    ),
  },
];

/**
 * ============================================================================
 */

/**
 * APPROACH 3: Custom Wrapper Component (Reusable)
 * ===============================================
 *
 * Best for: Tables with multiple entity types + custom styling
 * Effort: Create once, use everywhere
 *
 * Example: AssetCourseMappings table with asset and course pills
 */

// Create a wrapper component: src/components/table/AssetCourseMappingCells.jsx
import TableEntityPill from "components/table/TableEntityPill";

export function AssetCodeCell({ row }) {
  return <TableEntityPill entityType="asset" row={row} />;
}

export function CourseCodeCell({ row }) {
  return <TableEntityPill entityType="course" row={row} />;
}

// Then in AssetCourseMappingsTable.jsx:
import { AssetCodeCell, CourseCodeCell } from "./AssetCourseMappingCells";

const columns = [
  {
    header: "Asset Code",
    accessor: "assetCode",
    render: AssetCodeCell,
  },
  {
    header: "Course Code",
    accessor: "courseCode",
    render: CourseCodeCell,
  },
];

/**
 * ============================================================================
 */

/**
 * CONFIGURATION - Supported Entity Types
 * ======================================
 *
 * Each entity type has automatic field mapping:
 */

const supportedTypes = {
  asset: {
    codeField: "assetCode",
    idField: "assetID",
    nameField: "assetName",
    adminPath: "/admin/assets",
  },
  class: {
    codeField: "classCode",
    idField: "classID",
    nameField: "className",
    adminPath: "/admin/classes",
  },
  student: {
    codeField: "studentCode",
    idField: "studentID",
    nameField: "studentName",
    adminPath: "/admin/studentEquipmentAssignments",
  },
  course: {
    codeField: "courseCode",
    idField: "courseID",
    nameField: "courseName",
    adminPath: "/admin/courses",
  },
  department: {
    codeField: "departmentCode",
    idField: "departmentID",
    nameField: "departmentName",
    adminPath: "/admin/departments",
  },
  room: {
    codeField: "roomCode",
    idField: "roomID",
    nameField: "roomName",
    adminPath: "/admin/rooms",
  },
  user: {
    codeField: "email",
    idField: "userID",
    nameField: "fullName",
    adminPath: "/admin/users",
  },
  instructor: {
    codeField: "instructorCode",
    idField: "instructorID",
    nameField: "fullName",
    adminPath: "/admin/instructors",
  },
  technician: {
    codeField: "technicianCode",
    idField: "technicianID",
    nameField: "fullName",
    adminPath: "/admin/technicians",
  },
  worker: {
    codeField: "employeeCode",
    idField: "workerID",
    nameField: "fullName",
    adminPath: "/admin/workers",
  },
};

/**
 * ============================================================================
 */

/**
 * STEP-BY-STEP: Convert an Existing Admin Table
 * ==============================================
 *
 * Example: AssetsTable.jsx
 * Location: src/views/admin/assets/components/AssetsTable.jsx
 *
 */

// Step 1: Import the component
// Add to imports:
import TableEntityPill from "components/table/TableEntityPill";

// Step 2: Update column definition
// Find the column that renders assetCode:
const columns = [
  {
    header: "Asset Code",
    // Keep accessor as-is (for sorting, searching)
    accessor: "assetCode",
    sortKey: "assetCode",
    // Add render function to display pill instead of plain text
    render: (row) => <TableEntityPill entityType="asset" row={row} />,
  },
  // ... other columns unchanged ...
];

// Step 3: Test
// Run the app, navigate to the table, verify pills appear and click opens modal

/**
 * ============================================================================
 */

/**
 * FEATURES & BENEFITS
 * ===================
 *
 * ✅ Consistent UI across all entity types (same color, styling)
 * ✅ Click to view entity details in modal
 * ✅ Admin users see "Edit" button in modal footer
 * ✅ Modal automatically navigates to correct admin page
 * ✅ Extensible: Easy to add new entity types
 * ✅ Backward compatible: Accessor still works for searching/sorting
 * ✅ Performance: Lazy loads modal only on click
 * ✅ i18n ready: Uses TranslationKeys for all labels
 *
 */

/**
 * STYLING
 * =======
 *
 * Pills use Tailwind colors:
 * - asset: blue-100/800 (blue)
 * - class: teal-100/800 (teal)
 * - student: purple-100/800 (purple)
 * - user: indigo-100/800 (indigo)
 * - instructor: pink-100/800 (pink)
 * - technician: orange-100/800 (orange)
 * - worker: cyan-100/800 (cyan)
 * - department: yellow-100/800 (yellow)
 * - course: green-100/800 (green)
 * - room: rose-100/800 (rose)
 *
 * To customize:
 * 1. Edit EntityPill.jsx pillColors object
 * 2. Or pass className prop: <TableEntityPill ... className="my-custom-class" />
 *
 */

/**
 * COMMON PATTERNS
 * ===============
 */

// Pattern 1: Multiple entity types in one table
const mixedColumns = [
  {
    header: "Asset",
    accessor: "assetCode",
    render: (row) => <TableEntityPill entityType="asset" row={row} />,
  },
  {
    header: "Room",
    accessor: "roomName",
    render: (row) => <TableEntityPill entityType="room" row={row} />,
  },
  {
    header: "Assigned To",
    accessor: (row) => row.workerName,
    render: (row) => (
      <TableEntityPill
        entityType="worker"
        row={row}
        className="whitespace-nowrap"
      />
    ),
  },
];

// Pattern 2: Conditional pills (if user has permission)
import { useAuth } from "context/AuthContext";

function AssetCodeWithFallback({ row }) {
  const { hasAnyRole } = useAuth();
  const canViewDetails = hasAnyRole(["Admin", "Technician"]);

  if (!canViewDetails) {
    return <span className="text-sm text-gray-600">{row.assetCode}</span>;
  }

  return <TableEntityPill entityType="asset" row={row} />;
}

// Pattern 3: Nullable/optional codes
function StudentCodeWithFallback({ row }) {
  if (!row.studentCode && !row.studentID) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return <TableEntityPill entityType="student" row={row} />;
}

export { supportedTypes };
