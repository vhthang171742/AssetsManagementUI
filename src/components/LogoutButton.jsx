import React from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";

/**
 * LogoutButton Component
 * Provides a reusable logout button that can be used anywhere in the app
 * 
 * Usage:
 * <LogoutButton />
 * <LogoutButton text="Sign Out" className="custom-class" />
 */
export const LogoutButton = ({ 
  text = "Log Out", 
  className = "text-red-500 hover:text-red-600 transition duration-150 ease-out hover:ease-in",
  onLogoutComplete = null 
}) => {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Call optional callback before logout
      if (onLogoutComplete) {
        onLogoutComplete();
      }
      
      await instance.logoutRedirect({
        postLogoutRedirectUri: "/auth/sign-in",
      });
      // Note: After redirect, the user will be returned to the sign-in page by Azure AD
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoading}
      className={`${className} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isLoading ? "Logging out..." : text}
    </button>
  );
};

export default LogoutButton;
