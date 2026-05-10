/**
 * useEntityPillConfig - Hook to get pill configuration for different entity types
 *
 * Provides standardized configuration for rendering entity pills across admin views
 */

const entityPillConfigs = {
  asset: {
    type: "asset",
    codeField: "assetCode",
    idField: "assetID",
    nameField: "assetName",
    label: "Asset",
  },
  class: {
    type: "class",
    codeField: "classCode",
    idField: "classID",
    nameField: "className",
    label: "Class",
  },
  student: {
    type: "student",
    codeField: "studentCode",
    idField: "studentID",
    nameField: "studentName",
    label: "Student",
  },
  course: {
    type: "course",
    codeField: "courseCode",
    idField: "courseID",
    nameField: "courseName",
    label: "Course",
  },
  department: {
    type: "department",
    codeField: "departmentCode",
    idField: "departmentID",
    nameField: "departmentName",
    label: "Department",
  },
  room: {
    type: "room",
    codeField: "roomCode",
    idField: "roomID",
    nameField: "roomName",
    label: "Room",
  },
  user: {
    type: "user",
    codeField: "email",
    idField: "userID",
    nameField: "fullName",
    label: "User",
  },
  instructor: {
    type: "instructor",
    codeField: "instructorCode",
    idField: "instructorID",
    nameField: "fullName",
    label: "Instructor",
  },
  technician: {
    type: "technician",
    codeField: "technicianCode",
    idField: "technicianID",
    nameField: "fullName",
    label: "Technician",
  },
  worker: {
    type: "worker",
    codeField: "employeeCode",
    idField: "workerID",
    nameField: "fullName",
    label: "Worker",
  },
  productionLine: {
    type: "productionLine",
    codeField: "lineCode",
    idField: "productionLineID",
    nameField: "lineName",
    label: "Production Line",
  },
};

/**
 * Get pill configuration for an entity type
 * @param {string} entityType - The entity type (asset, class, student, etc.)
 * @returns {object} Configuration object with codeField, idField, etc.
 */
export function getPillConfig(entityType) {
  return entityPillConfigs[entityType] || entityPillConfigs.asset;
}

/**
 * Helper to extract code and ID from a row for pill rendering
 * @param {object} row - Data row from table
 * @param {string} entityType - The entity type
 * @returns {{code: string, id: string|number}} Code and ID for pill
 */
export function extractEntityData(row, entityType) {
  const config = getPillConfig(entityType);
  const code = row[config.codeField];
  const id = row[config.idField];
  return { code: code || id, id };
}

/**
 * Custom hook to get pill config
 */
export function useEntityPillConfig(entityType) {
  return getPillConfig(entityType);
}

export default getPillConfig;
