import { PublicClientApplication } from "@azure/msal-browser";
import msalConfig from "config/msalConfig";
import { httpClient } from "./httpClient";

/**
 * User Service - Manages user profile data from Microsoft Graph and backend API
 */

let msalInstance = null;

const getMsalInstance = () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
};

/**
 * Get user profile information from Microsoft Graph API
 * @returns {Promise<Object>} User profile data including name, email, photo, jobTitle, department, etc.
 */
export const getUserProfile = async () => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    // Get access token for Microsoft Graph API
    const tokenRequest = {
      scopes: ["user.read"],
      account: accounts[0],
    };

    const tokenResponse = await instance.acquireTokenSilent(tokenRequest);
    const accessToken = tokenResponse.accessToken;

    // Call Microsoft Graph API to get user info
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const userProfile = await response.json();
    return {
      id: userProfile.id,
      displayName: userProfile.displayName,
      givenName: userProfile.givenName,
      surname: userProfile.surname,
      email: userProfile.userPrincipalName || userProfile.mail,
      jobTitle: userProfile.jobTitle || "N/A",
      department: userProfile.department || "N/A",
      officeLocation: userProfile.officeLocation || "N/A",
      mobilePhone: userProfile.mobilePhone || "N/A",
      businessPhones: userProfile.businessPhones || [],
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Get user's profile photo from Microsoft Graph API
 * Returns photo as base64 data URL
 * @returns {Promise<string|null>} Base64 data URL of user photo or null
 */
export const getUserPhoto = async () => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const tokenRequest = {
      scopes: ["user.read"],
      account: accounts[0],
    };

    const tokenResponse = await instance.acquireTokenSilent(tokenRequest);
    const accessToken = tokenResponse.accessToken;

    const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // User might not have a profile photo
      return null;
    }

    const photoBlob = await response.blob();
    return URL.createObjectURL(photoBlob);
  } catch (error) {
    console.warn("Error fetching user photo:", error.message);
    return null;
  }
};

/**
 * Get user's group membership from Microsoft Graph API
 * Requires 'Directory.Read.All' permission for group info, or 'user.read' for basic access
 * @returns {Promise<Array>} Array of groups the user belongs to
 */
export const getUserGroups = async () => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      return [];
    }

    const tokenRequest = {
      scopes: ["user.read"],
      account: accounts[0],
    };

    const tokenResponse = await instance.acquireTokenSilent(tokenRequest);
    const accessToken = tokenResponse.accessToken;

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/memberOf?$select=displayName,id",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user groups");
    }

    const data = await response.json();
    // Map groups and use id as fallback if displayName is null
    return (data.value || []).map(group => ({
      ...group,
      displayName: group.displayName || group.id
    }));
  } catch (error) {
    console.warn("Error fetching user groups:", error.message);
    return [];
  }
};

// ============================================================
// Backend API User Management (JIT Provisioning)
// ============================================================

/**
 * Get current authenticated user's profile from backend API
 * @returns {Promise<Object>} User profile with roles
 */
export const getCurrentUser = async () => {
  return await httpClient("/users/me");
};

/**
 * Get all users (Admin only)
 * @returns {Promise<Array>} List of all users with roles
 */
export const getAllUsers = async () => {
  return await httpClient("/users");
};

/**
 * Assign a role to a user (Admin only)
 * @param {number} userId - User ID
 * @param {string} role - Role name (Student, Worker, Instructor, Technician)
 * @param {string} roleCode - Optional business code
 * @param {Object} roleData - Optional role-specific data
 * @returns {Promise<Object>} Success response
 */
export const assignRole = async (userId, role, roleCode = null, roleData = null) => {
  return await httpClient(`/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({
      userID: userId,
      role,
      roleCode,
      roleData,
    }),
  });
};

/**
 * Remove a role from a user (Admin only)
 * @param {number} userId - User ID
 * @param {string} role - Role name
 * @returns {Promise<Object>} Success response
 */
export const removeRole = async (userId, role) => {
  return await httpClient(`/users/${userId}/roles/${role}`, {
    method: "DELETE",
  });
};

/**
 * Update user's business code (Admin only)
 * @param {number} userId - User ID
 * @param {string} role - Role name
 * @param {string} code - New code value
 * @returns {Promise<Object>} Success response
 */
export const updateUserCode = async (userId, role, code) => {
  return await httpClient(`/users/${userId}/code`, {
    method: "PUT",
    body: JSON.stringify({
      role,
      code,
    }),
  });
};

export default {
  getUserProfile,
  getUserPhoto,
  getUserGroups,
  getCurrentUser,
  getAllUsers,
  assignRole,
  removeRole,
  updateUserCode,
};
