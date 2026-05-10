/**
 * QUICK REFERENCE - Entity Pills in Admin Tables
 * 
 * Copy-paste ready examples for common use cases
 */

/**
 * 1. Single Entity Code as Pill
 * ============================
 */

// Single line render in column definition
{
  header: "Asset Code",
  accessor: "assetCode",
  render: (row) => <TableEntityPill entityType="asset" row={row} />
}

/**
 * 2. Multiple Entity Types in One Table
 * ====================================
 */

import TableEntityPill from "components/table/TableEntityPill";

const columns = [
  {
    header: "Asset",
    accessor: "assetCode",
    render: (row) => <TableEntityPill entityType="asset" row={row} />
  },
  {
    header: "Student", 
    accessor: "studentCode",
    render: (row) => <TableEntityPill entityType="student" row={row} />
  },
  {
    header: "Class",
    accessor: "classCode", 
    render: (row) => <TableEntityPill entityType="class" row={row} />
  }
];

/**
 * 3. With Fallback for Missing Code
 * ================================
 */

{
  header: "Assigned To",
  accessor: "workerCode",
  render: (row) => {
    if (!row.workerCode && !row.workerID) {
      return <span className="text-gray-400">Not assigned</span>;
    }
    return <TableEntityPill entityType="worker" row={row} />;
  }
}

/**
 * 4. Custom Styling
 * ================
 */

{
  header: "Critical Asset",
  accessor: "assetCode",
  render: (row) => (
    <TableEntityPill
      entityType="asset"
      row={row}
      className="ring-2 ring-red-300"
    />
  )
}

/**
 * 5. With Custom Modal Data
 * ========================
 */

import EntityPill from "components/EntityPill";

{
  header: "Asset Serial",
  accessor: "assetCode",
  render: (row) => (
    <EntityPill
      type="asset"
      id={row.assetID}
      label={row.assetCode}
      modalData={{
        serialNumber: row.serialNumber,
        assetStatus: row.status
      }}
    />
  )
}

/**
 * 6. Conditional Rendering (Permission Based)
 * ===========================================
 */

import { useAuth } from "context/AuthContext";
import TableEntityPill from "components/table/TableEntityPill";

function TableColumns() {
  const { hasAnyRole } = useAuth();
  const canViewDetails = hasAnyRole(["Admin", "Supervisor"]);

  const columns = [
    {
      header: "Asset",
      accessor: "assetCode",
      render: (row) => 
        canViewDetails ? (
          <TableEntityPill entityType="asset" row={row} />
        ) : (
          <span className="text-sm">{row.assetCode}</span>
        )
    }
  ];

  return columns;
}

/**
 * 7. Extracting Entity Data (Advanced)
 * ===================================
 */

import { extractEntityData } from "hooks/useEntityPillConfig";

// In a function or component
function getEntityInfo(row, entityType) {
  const { code, id } = extractEntityData(row, entityType);
  console.log(`Entity ${entityType}: code=${code}, id=${id}`);
  return code;
}

/**
 * 8. Creating a Custom Entity Pill Component
 * =========================================
 */

// src/components/table/WorkerAssetPill.jsx
import TableEntityPill from "components/table/TableEntityPill";

export function WorkerPill({ row }) {
  return <TableEntityPill entityType="worker" row={row} />;
}

export function AssetPill({ row }) {
  return <TableEntityPill entityType="asset" row={row} />;
}

// Usage in table
import { WorkerPill, AssetPill } from "./WorkerAssetPill";

const columns = [
  { header: "Worker", accessor: "workerCode", render: WorkerPill },
  { header: "Asset", accessor: "assetCode", render: AssetPill }
];

/**
 * 9. All Supported Entity Types Reference
 * ======================================
 */

const supportedTypes = {
  asset: "assetCode",        // Asset -> assetID
  class: "classCode",        // Class -> classID  
  student: "studentCode",    // Student -> studentID
  course: "courseCode",      // Course -> courseID
  department: "departmentCode", // Department -> departmentID
  room: "roomCode",          // Room -> roomID
  user: "email",             // User -> userID
  instructor: "instructorCode", // Instructor -> instructorID
  technician: "technicianCode", // Technician -> technicianID
  worker: "employeeCode"     // Worker -> workerID
};

/**
 * 10. Testing Pills Locally
 * =======================
 */

// Add to a test component temporarily
import TableEntityPill from "components/table/TableEntityPill";

export default function PillTest() {
  const testRows = [
    { assetCode: "AST-001", assetID: 1 },
    { studentCode: "STU-001", studentID: 1 },
    { classCode: "CLS-001", classID: 1 },
  ];

  return (
    <div className="space-y-4 p-4">
      {testRows.map((row, i) => (
        <div key={i}>
          <h3>Asset Pill:</h3>
          <TableEntityPill entityType="asset" row={testRows[0]} />
          
          <h3>Student Pill:</h3>
          <TableEntityPill entityType="student" row={testRows[1]} />
          
          <h3>Class Pill:</h3>
          <TableEntityPill entityType="class" row={testRows[2]} />
        </div>
      ))}
    </div>
  );
}

/**
 * TROUBLESHOOTING
 * ===============
 *
 * Problem: Pill shows ID instead of code
 * Solution: Ensure row has the code field (e.g. assetCode for asset type)
 *
 * Problem: Modal doesn't open when clicked
 * Solution: Make sure you're using EntityPill or TableEntityPill component
 *
 * Problem: Modal shows "Loading..." forever
 * Solution: Check browser console for API errors, verify service getById method exists
 *
 * Problem: Wrong entity type colors
 * Solution: Check useEntityPillConfig.js entityPillConfigs mapping for correct type name
 *
 * Problem: Edit button not showing in modal
 * Solution: Make sure user has Admin role (check with useAuth().hasAnyRole(['Admin']))
 */

export default {};
