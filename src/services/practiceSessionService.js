/**
 * Practice Session Service
 * Handles all practice session-related API calls
 */
import { httpClient } from "./httpClient";

export const practiceSessionService = {
  /**
   * Get all practice sessions
   * @returns {Promise<Array>} List of practice sessions
   */
  getAll: () => httpClient("/practice-sessions"),

  /**
   * Get a specific practice session by ID
   * @param {number} id - Session ID
   * @returns {Promise<object>} Practice session details with error logs and evaluations
   */
  getById: (id) => httpClient(`/practice-sessions/${id}`),

  /**
   * Get practice sessions for a specific student
   * @param {number} studentId - Student ID
   * @returns {Promise<Array>} List of practice sessions for student
   */
  getByStudent: (studentId) =>
    httpClient(`/practice-sessions/by-student/${studentId}`),

  /**
   * Get practice sessions for a specific class
   * @param {number} classId - Class ID
   * @returns {Promise<Array>} List of practice sessions for class
   */
  getByClass: (classId) =>
    httpClient(`/practice-sessions/by-class/${classId}`),

  /**
   * Get practice sessions for a specific equipment
   * @param {number} roomAssetId - Room Asset ID
   * @returns {Promise<Array>} List of practice sessions for equipment
   */
  getByEquipment: (roomAssetId) =>
    httpClient(`/practice-sessions/by-equipment/${roomAssetId}`),

  /**
   * Create a new practice session
   * @param {object} data - Session data {studentID, roomAssetID, classID, startTime, qrCodeScanned, scanTimestamp}
   * @returns {Promise<object>} Created practice session
   */
  create: (data) =>
    httpClient("/practice-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Student self check-in (attendance)
   * @param {object} data - { assignmentID, classID? }
   * @returns {Promise<object>} Created/opened practice session
   */
  studentCheckIn: (data) =>
    httpClient("/practice-sessions/student/check-in", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Student self check-out (attendance)
   * @param {object} data - { sessionID }
   * @returns {Promise<object>} Updated practice session
   */
  studentCheckOut: (data) =>
    httpClient("/practice-sessions/student/check-out", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a practice session
   * @param {number} id - Session ID
   * @param {object} data - Updated session data {endTime, durationMinutes}
   * @returns {Promise<object>} Updated practice session
   */
  update: (id, data) =>
    httpClient(`/practice-sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a practice session
   * @param {number} id - Session ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/practice-sessions/${id}`, {
      method: "DELETE",
    }),

  /**
   * Bulk delete practice sessions
   * @param {Array<number>} ids - Array of session IDs to delete
   * @returns {Promise<void>}
   */
  bulkDelete: (ids) =>
    httpClient("/practice-sessions/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

/**
 * Practice Error Log Service
 * Handles all practice error log-related API calls
 */
export const practiceErrorLogService = {
  /**
   * Get all practice error logs
   * @returns {Promise<Array>} List of error logs
   */
  getAll: () => httpClient("/practice-error-logs"),

  /**
   * Get a specific error log by ID
   * @param {number} id - Error Log ID
   * @returns {Promise<object>} Error log details
   */
  getById: (id) => httpClient(`/practice-error-logs/${id}`),

  /**
   * Get error logs for a specific practice session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} List of error logs for session
   */
  getBySession: (sessionId) =>
    httpClient(`/practice-error-logs/by-session/${sessionId}`),

  /**
   * Create a new practice error log
   * @param {object} data - Error log data {sessionID, errorType, errorTime, studentDescription, instructorNotified}
   * @returns {Promise<object>} Created error log
   */
  create: (data) =>
    httpClient("/practice-error-logs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a practice error log
   * @param {number} id - Error Log ID
   * @param {object} data - Updated error log data {faultConfirmedBy, actualCause, resolutionTime, resolutionNotes}
   * @returns {Promise<object>} Updated error log
   */
  update: (id, data) =>
    httpClient(`/practice-error-logs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a practice error log
   * @param {number} id - Error Log ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/practice-error-logs/${id}`, {
      method: "DELETE",
    }),
};

/**
 * Session Evaluation Service
 * Handles all instructor session evaluation-related API calls
 */
export const sessionEvaluationService = {
  /**
   * Get all session evaluations
   * @returns {Promise<Array>} List of session evaluations
   */
  getAll: () => httpClient("/session-evaluations"),

  /**
   * Get a specific evaluation by ID
   * @param {number} id - Evaluation ID
   * @returns {Promise<object>} Session evaluation details
   */
  getById: (id) => httpClient(`/session-evaluations/${id}`),

  /**
   * Get evaluations for a specific practice session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} List of evaluations for session
   */
  getBySession: (sessionId) =>
    httpClient(`/session-evaluations/by-session/${sessionId}`),

  /**
   * Get evaluations by a specific instructor
   * @param {number} instructorId - Instructor ID
   * @returns {Promise<Array>} List of evaluations by instructor
   */
  getByInstructor: (instructorId) =>
    httpClient(`/session-evaluations/by-instructor/${instructorId}`),

  /**
   * Create a new session evaluation
   * @param {object} data - Evaluation data {sessionID, instructorID, attendanceConfirmed, progressCompliance, sopViolations, complianceRating, generalFeedback, evaluationDate}
   * @returns {Promise<object>} Created evaluation
   */
  create: (data) =>
    httpClient("/session-evaluations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a session evaluation
   * @param {number} id - Evaluation ID
   * @param {object} data - Updated evaluation data
   * @returns {Promise<object>} Updated evaluation
   */
  update: (id, data) =>
    httpClient(`/session-evaluations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a session evaluation
   * @param {number} id - Evaluation ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/session-evaluations/${id}`, {
      method: "DELETE",
    }),
};
