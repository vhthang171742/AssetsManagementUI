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
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUserPhoto(null);
        setUserGroups([]);
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
   */
  const isUserInGroup = (groupName) => {
    return userGroups.some(
      (group) => group.displayName?.toLowerCase() === groupName.toLowerCase()
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

  const value = {
    user,
    userProfile,
    userPhoto,
    userGroups,
    isAuthenticated,
    isLoading,
    isDarkMode,
    toggleDarkMode,
    inProgress,
    isUserInGroup,
    getUserRole,
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
