import React, { createContext, useContext, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { getUserProfile, getUserPhoto, getUserGroups } from "services/userService";
import { acquireTokenForApi } from "services/tokenService";

/**
 * AuthContext - Manages authentication state and session persistence
 * Provides user info, loading state, and dark mode preferences across the app
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { accounts, inProgress } = useMsal();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      const isDark = JSON.parse(savedDarkMode);
      setIsDarkMode(isDark);
      updateDarkMode(isDark);
    }
    setIsLoading(false);
  }, []);

  // Fetch detailed user profile when accounts change (after login)
  useEffect(() => {
    const fetchUserData = async () => {
      if (accounts.length > 0) {
        const account = accounts[0];
        
        // Set basic user info from MSAL
        setUser({
          name: account.name || account.username,
          email: account.username,
          id: account.localAccountId,
          homeAccountId: account.homeAccountId,
        });

        // Extract roles from both ID token and API access token
        let roles = [];
        
        // First, check ID token claims
        if (account.idTokenClaims?.roles) {
          roles = account.idTokenClaims.roles;
          console.log("Roles found in ID token:", roles);
        }
        
        // If no roles in ID token, try to get API access token and extract roles from there
        if (roles.length === 0) {
          try {
            const tokenResponse = await acquireTokenForApi(false); // Get API token silently
            console.log("API token response:", tokenResponse);
            
            if (tokenResponse?.accessToken) {
              // Decode the access token to get roles
              const tokenParts = tokenResponse.accessToken.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log("Decoded access token payload:", payload);
                roles = payload.roles || [];
                console.log("Roles extracted from access token:", roles);
              }
            }
          } catch (error) {
            console.warn("Could not acquire API token for role extraction:", error.message);
          }
        }
        
        setUserRoles(roles);
        console.log("=== AUTHORIZATION DEBUG ===");
        console.log("User roles from token:", roles);
        console.log("Required roles from env:", process.env.REACT_APP_REQUIRED_ROLES);
        console.log("API scopes from env:", process.env.REACT_APP_API_SCOPES);
        console.log("ID token claims:", account.idTokenClaims);
        console.log("=========================");
        
        // FORCE CONSENT: Request API token immediately to trigger consent flow
        try {
          console.log("Requesting API consent on login...");
          await acquireTokenForApi(true); // true = force interactive popup
          console.log("API consent successful");
        } catch (error) {
          console.warn("API consent request failed:", error.message);
          // Don't block login even if consent fails
        }

        // Fetch detailed profile from Microsoft Graph
        try {
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
        setUserRoles([]);
      }
    };

    if (inProgress === "none") {
      fetchUserData();
    }
  }, [accounts, inProgress]);

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
   * Check if user has at least one required role
   * Checks if user has any of the required app roles from environment config
   * Falls back to REACT_APP_API_SCOPES if REACT_APP_REQUIRED_ROLES not set
   */
  const hasRequiredRole = () => {
    // Get required roles from environment (with fallback to API scopes)
    const requiredRolesEnv = process.env.REACT_APP_REQUIRED_ROLES || process.env.REACT_APP_API_SCOPES;
    
    if (!requiredRolesEnv) {
      console.warn("Neither REACT_APP_REQUIRED_ROLES nor REACT_APP_API_SCOPES configured. Denying access.");
      return false;
    }

    const requiredRoles = requiredRolesEnv
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    console.log("User roles from token:", userRoles);
    console.log("Required roles from config:", requiredRoles);

    // Check if user has any of the required roles
    const hasRole = userRoles.some((userRole) =>
      requiredRoles.some(
        (requiredRole) => userRole.toLowerCase() === requiredRole.toLowerCase()
      )
    );

    console.log("Has required role:", hasRole);
    return hasRole;
  };

  const value = {
    user,
    userProfile,
    userPhoto,
    userGroups,
    userRoles,
    isAuthenticated,
    isLoading,
    isDarkMode,
    toggleDarkMode,
    inProgress,
    isUserInGroup,
    getUserRole,
    hasRequiredRole,
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
