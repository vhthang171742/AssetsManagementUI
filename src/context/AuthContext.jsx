import React, { createContext, useContext, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  getCurrentUser,
  getUserProfile,
  getUserPhoto,
  getUserGroups,
} from "services/userService";
import { PortalConfigs, PortalIds } from "constants/portals";
import { RoleSets } from "constants/authorization";

/**
 * AuthContext - Manages authentication state and session persistence
 * Provides user info, loading state, and dark mode preferences across the app
 */
const AuthContext = createContext(null);

const normalize = (value) => (value || "").toLowerCase();

const getDbRoleFlags = (currentUser) => ({
  student: Boolean(currentUser?.studentRole && (currentUser.studentRole.isActive ?? true)),
  instructor: Boolean(currentUser?.instructorRole && (currentUser.instructorRole.isActive ?? true)),
  technician: Boolean(currentUser?.technicianRole && (currentUser.technicianRole.isActive ?? true)),
  worker: Boolean(currentUser?.workerRole && (currentUser.workerRole.isActive ?? true)),
  productionmanager: Boolean(
    currentUser?.productionManagerRole && (currentUser.productionManagerRole.isActive ?? true)
  ),
});

const extractClaimRoles = (claims = {}) => {
  const rawValues = [
    claims?.roles,
    claims?.role,
    claims?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
    claims?.["http://schemas.microsoft.com/identity/claims/roles"],
  ];

  return rawValues
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string") {
        if (value.includes(",")) {
          return value.split(",").map((item) => item.trim()).filter(Boolean);
        }

        return [value];
      }

      return [];
    })
    .filter(Boolean);
};

const decodeBase64Url = (value = "") => {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padding);

  try {
    return atob(padded);
  } catch {
    return "";
  }
};

const parseJwtPayload = (token = "") => {
  if (!token || token.split(".").length < 2) {
    return null;
  }

  const payload = decodeBase64Url(token.split(".")[1]);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const getCachedAccessTokenRoles = (account = null) => {
  if (typeof window === "undefined") {
    return [];
  }

  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID;
  if (!clientId) {
    return [];
  }

  const homeAccountId = account?.homeAccountId || "";
  const storageCandidates = [window.sessionStorage, window.localStorage];
  const roles = new Set();

  for (const storage of storageCandidates) {
    if (!storage) {
      continue;
    }

    const tokenKeysRaw = storage.getItem(`msal.token.keys.${clientId}`);
    if (!tokenKeysRaw) {
      continue;
    }

    let tokenKeys;
    try {
      tokenKeys = JSON.parse(tokenKeysRaw);
    } catch {
      continue;
    }

    const accessTokenKeys = Array.isArray(tokenKeys?.accessToken) ? tokenKeys.accessToken : [];

    for (const tokenKey of accessTokenKeys) {
      if (homeAccountId && !tokenKey.includes(homeAccountId)) {
        continue;
      }

      const tokenEntryRaw = storage.getItem(tokenKey);
      if (!tokenEntryRaw) {
        continue;
      }

      let tokenEntry;
      try {
        tokenEntry = JSON.parse(tokenEntryRaw);
      } catch {
        continue;
      }

      const payload = parseJwtPayload(tokenEntry?.secret);
      const claimRoles = extractClaimRoles(payload || {});
      for (const role of claimRoles) {
        roles.add(role);
      }
    }
  }

  return Array.from(roles);
};

const getAppRoleFlags = (account = null) => {
  const idTokenRoles = extractClaimRoles(account?.idTokenClaims || {});
  const accessTokenRoles = getCachedAccessTokenRoles(account);
  const normalizedRoles = new Set([...idTokenRoles, ...accessTokenRoles].map(normalize));

  return {
    admin: normalizedRoles.has("admin"),
  };
};

const expandRequiredRoles = (requiredRoles = []) => {
  const supportedRoles = ["admin", "student", "instructor", "technician", "worker", "productionmanager"];
  const expanded = new Set();
  for (const role of requiredRoles) {
    const key = normalize(role);
    if (!key) {
      continue;
    }

    if (supportedRoles.includes(key)) {
      expanded.add(key);
      continue;
    }

  }

  return Array.from(expanded);
};

export const AuthProvider = ({ children }) => {
  const { accounts, inProgress, instance } = useMsal();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPortalId, setSelectedPortalId] = useState(
    () => localStorage.getItem("selectedPortalId") || null
  );

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      const isDark = JSON.parse(savedDarkMode);
      setIsDarkMode(isDark);
      updateDarkMode(isDark);
    }
  }, []);

  // Fetch detailed user profile when accounts change (after login)
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        if (accounts.length > 0) {
          const account = instance.getActiveAccount() || accounts[0];
        
        // Set basic user info from MSAL
        setUser({
          name: account.name || account.username,
          email: account.username,
          id: account.localAccountId,
          homeAccountId: account.homeAccountId,
        });


        // Fetch detailed profile from Microsoft Graph
        try {
          try {
            const backendUser = await getCurrentUser();
            setCurrentUser(backendUser || null);
          } catch (error) {
            console.warn("Failed to fetch backend user profile:", error.message);
            setCurrentUser(null);
          }

          const profile = await getUserProfile();
          if (profile) {
            setUserProfile(profile);
          }

          const photo = await getUserPhoto();
          if (photo) {
            setUserPhoto(photo);
          }

          const groups = await getUserGroups();
          if (groups) {
            setUserGroups(groups);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Set empty groups array on error to prevent blocking
          setUserGroups([]);
        }
        } else {
          setUser(null);
          setUserProfile(null);
          setUserPhoto(null);
          setUserGroups([]);
          setCurrentUser(null);
          setSelectedPortalId(null);
          localStorage.removeItem("selectedPortalId");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (inProgress === "none") {
      fetchUserData();
    }
  }, [accounts, inProgress, instance]);

  /**
   * Toggle dark mode and persist to localStorage
   */
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(newDarkMode));
    updateDarkMode(newDarkMode);
  };

  /**
   * Apply dark mode to document
   */
  const updateDarkMode = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = accounts.length > 0;

  const hasAnyRole = (requiredRoles = []) => {
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return false;
    }

    const dbFlags = getDbRoleFlags(currentUser);
    const activeAccount = instance.getActiveAccount() || accounts[0] || null;
    const appRoleFlags = getAppRoleFlags(activeAccount);
    const normalizedRequiredRoles = expandRequiredRoles(requiredRoles);
    return normalizedRequiredRoles.some((role) => Boolean(dbFlags[role]) || Boolean(appRoleFlags[role]));
  };

  const hasAnyGroup = (requiredGroups = []) => {
    if (!Array.isArray(requiredGroups) || requiredGroups.length === 0) {
      return false;
    }

    const normalizedGroups = requiredGroups.map(normalize);
    return (userGroups || []).some((group) => {
      const displayName = normalize(group.displayName);
      const id = normalize(group.id);
      return normalizedGroups.includes(displayName) || normalizedGroups.includes(id);
    });
  };

  const canAccessPortal = (portalId) => {
    const portal = PortalConfigs.find((item) => item.id === portalId);
    if (!portal) {
      return false;
    }

    if (portalId === PortalIds.Admin) {
      return hasAnyRole(RoleSets.Admin);
    }

    return hasAnyRole(portal.requiredRoles || []);
  };

  const getAvailablePortals = () => {
    return PortalConfigs.filter((portal) => canAccessPortal(portal.id));
  };

  const setSelectedPortal = (portalId) => {
    setSelectedPortalId(portalId);
    if (portalId) {
      localStorage.setItem("selectedPortalId", portalId);
    } else {
      localStorage.removeItem("selectedPortalId");
    }
  };

  /**
   * Check if user belongs to a specific group
   * Checks both displayName and id (since displayName might be null without proper permissions)
   */
  const isUserInGroup = (groupNameOrId) => {
    return userGroups.some(
      (group) => 
        group.displayName?.toLowerCase() === groupNameOrId.toLowerCase() ||
        group.id?.toLowerCase() === groupNameOrId.toLowerCase()
    );
  };

  /**
   * Get user role based on group membership
   */
  const getUserRole = () => {
    if (isUserInGroup("admins")) return "admin";
    if (isUserInGroup("teachers")) return "teacher";
    if (isUserInGroup("students")) return "student";
    return "user";
  };

  /**
   * Legacy helper kept for compatibility. Uses DB roles only.
   */
  const hasRequiredRole = () => {
    return hasAnyRole(["student", "instructor", "worker", "technician", "productionmanager"]);
  };

  const value = {
    user,
    userProfile,
    userPhoto,
    currentUser,
    setCurrentUser,
    userGroups,
    isAuthenticated,
    isLoading,
    isDarkMode,
    toggleDarkMode,
    inProgress,
    isUserInGroup,
    getUserRole,
    hasRequiredRole,
    hasAnyRole,
    hasAnyGroup,
    canAccessPortal,
    getAvailablePortals,
    selectedPortalId,
    setSelectedPortal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
