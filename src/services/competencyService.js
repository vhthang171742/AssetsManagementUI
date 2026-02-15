/**
 * Competency Profile Service
 * Handles all competency profile-related API calls
 */
import { httpClient } from "./httpClient";

export const competencyProfileService = {
  /**
   * Get all competency profiles
   * @returns {Promise<Array>} List of competency profiles
   */
  getAll: () => httpClient("/competency-profiles"),

  /**
   * Get a specific competency profile by ID
   * @param {number} id - Profile ID
   * @returns {Promise<object>} Competency profile details with competencies, certifications, and rankings
   */
  getById: (id) => httpClient(`/competency-profiles/${id}`),

  /**
   * Get competency profile for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Competency profile for user
   */
  getByUser: (userId) =>
    httpClient(`/competency-profiles/by-user/${userId}`),

  /**
   * Create a new competency profile
   * @param {object} data - Profile data {userID, totalPracticeHours, sopComplianceRate, operationalErrorCount, maintenanceAwareness, stabilityScore}
   * @returns {Promise<object>} Created competency profile
   */
  create: (data) =>
    httpClient("/competency-profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a competency profile
   * @param {number} id - Profile ID
   * @param {object} data - Updated profile data
   * @returns {Promise<object>} Updated competency profile
   */
  update: (id, data) =>
    httpClient(`/competency-profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Recalculate competency metrics for a user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated competency profile with recalculated metrics
   */
  recalculate: (userId) =>
    httpClient(`/competency-profiles/${userId}/recalculate`, {
      method: "POST",
    }),

  /**
   * Delete a competency profile
   * @param {number} id - Profile ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/competency-profiles/${id}`, {
      method: "DELETE",
    }),
};

/**
 * Equipment Competency Service
 * Handles all equipment competency-related API calls
 */
export const equipmentCompetencyService = {
  /**
   * Get all equipment competencies
   * @returns {Promise<Array>} List of equipment competencies
   */
  getAll: () => httpClient("/equipment-competencies"),

  /**
   * Get a specific equipment competency by ID
   * @param {number} id - Competency ID
   * @returns {Promise<object>} Equipment competency details
   */
  getById: (id) => httpClient(`/equipment-competencies/${id}`),

  /**
   * Get equipment competencies for a specific profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} List of equipment competencies for profile
   */
  getByProfile: (profileId) =>
    httpClient(`/equipment-competencies/by-profile/${profileId}`),

  /**
   * Create a new equipment competency
   * @param {object} data - Competency data {profileID, machineType, skillLevel, hoursOnMachine, certificationDate, expiryDate}
   * @returns {Promise<object>} Created equipment competency
   */
  create: (data) =>
    httpClient("/equipment-competencies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update an equipment competency
   * @param {number} id - Competency ID
   * @param {object} data - Updated competency data
   * @returns {Promise<object>} Updated equipment competency
   */
  update: (id, data) =>
    httpClient(`/equipment-competencies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete an equipment competency
   * @param {number} id - Competency ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/equipment-competencies/${id}`, {
      method: "DELETE",
    }),
};

/**
 * Certification Service
 * Handles all certification-related API calls
 */
export const certificationService = {
  /**
   * Get all certifications
   * @returns {Promise<Array>} List of certifications
   */
  getAll: () => httpClient("/certifications"),

  /**
   * Get a specific certification by ID
   * @param {number} id - Certification ID
   * @returns {Promise<object>} Certification details
   */
  getById: (id) => httpClient(`/certifications/${id}`),

  /**
   * Get certifications for a specific profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} List of certifications for profile
   */
  getByProfile: (profileId) =>
    httpClient(`/certifications/by-profile/${profileId}`),

  /**
   * Create a new certification
   * @param {object} data - Certification data {profileID, certificationName, issuedDate, expiryDate, issuedBy, certificateUrl, isInternal}
   * @returns {Promise<object>} Created certification
   */
  create: (data) =>
    httpClient("/certifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a certification
   * @param {number} id - Certification ID
   * @param {object} data - Updated certification data
   * @returns {Promise<object>} Updated certification
   */
  update: (id, data) =>
    httpClient(`/certifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a certification
   * @param {number} id - Certification ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/certifications/${id}`, {
      method: "DELETE",
    }),
};

/**
 * Skill Ranking Service
 * Handles all skill ranking-related API calls
 */
export const skillRankingService = {
  /**
   * Get all skill rankings
   * @returns {Promise<Array>} List of skill rankings
   */
  getAll: () => httpClient("/skill-rankings"),

  /**
   * Get a specific skill ranking by ID
   * @param {number} id - Ranking ID
   * @returns {Promise<object>} Skill ranking details
   */
  getById: (id) => httpClient(`/skill-rankings/${id}`),

  /**
   * Get skill rankings for a specific profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} List of skill rankings for profile
   */
  getByProfile: (profileId) =>
    httpClient(`/skill-rankings/by-profile/${profileId}`),

  /**
   * Get current skill ranking for a profile
   * @param {number} profileId - Profile ID
   * @returns {Promise<object>} Current skill ranking
   */
  getCurrentByProfile: (profileId) =>
    httpClient(`/skill-rankings/by-profile/${profileId}/current`),

  /**
   * Create a new skill ranking
   * @param {object} data - Ranking data {profileID, currentRank, rankAchievedDate, promotionEligible}
   * @returns {Promise<object>} Created skill ranking
   */
  create: (data) =>
    httpClient("/skill-rankings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Update a skill ranking
   * @param {number} id - Ranking ID
   * @param {object} data - Updated ranking data
   * @returns {Promise<object>} Updated skill ranking
   */
  update: (id, data) =>
    httpClient(`/skill-rankings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a skill ranking
   * @param {number} id - Ranking ID
   * @returns {Promise<void>}
   */
  delete: (id) =>
    httpClient(`/skill-rankings/${id}`, {
      method: "DELETE",
    }),
};
