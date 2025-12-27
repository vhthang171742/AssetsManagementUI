/**
 * HTTP Client for API calls with centralized error handling and MSAL token integration
 */
import { PublicClientApplication } from "@azure/msal-browser";
import msalConfig, { tokenRequest, tokenRequestWithAudience } from "config/msalConfig";

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Initialize MSAL instance for token acquisition
let msalInstance = null;

/**
 * Get or initialize MSAL instance
 */
const getMsalInstance = () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
};

/**
 * Extract meaningful error message from API response
 * @param {Response} response - Fetch response object
 * @returns {Promise<string>} Error message
 */
const extractErrorMessage = async (response) => {
  try {
    const errorData = await response.json();
    // Extract error message from various possible response formats
    // Priority: detail > message > title > statusText
    return (
      errorData.detail ||
      errorData.message ||
      errorData.title ||
      response.statusText ||
      "Unknown error"
    );
  } catch (e) {
    // If JSON parsing fails, use status text
    return response.statusText || "Unknown error";
  }
};

/**
 * Get access token for API calls from MSAL cache or by silent token request
 * If consent is required, falls back to interactive popup
 * @returns {Promise<string|null>} Access token for the API or null if not authenticated
 */
const getAccessToken = async () => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    const primaryScopes = Array.isArray(tokenRequest?.scopes) ? tokenRequest.scopes.length : 0;
    const fallbackScopes = Array.isArray(tokenRequestWithAudience?.scopes) ? tokenRequestWithAudience.scopes.length : 0;
    if (primaryScopes === 0 && fallbackScopes === 0) {
      console.warn(
        "API scopes are not configured. Skipping token acquisition. Set REACT_APP_API_APP_ID and REACT_APP_API_SCOPE(S) in .env."
      );
      return null;
    }

    // First try with the configured API scopes (api://appId/scope format)
    try {
      const silentRequest = {
        scopes: tokenRequest.scopes,
        account: accounts[0],
      };

      const response = await instance.acquireTokenSilent(silentRequest);
      console.debug("Token acquired with API scopes");
      return response.accessToken;
    } catch (primaryError) {
      // Check if error is due to missing consent
      if (primaryError.errorCode === "consent_required" || primaryError.errorCode === "interaction_required") {
        console.warn("Consent required for API scopes, prompting for interactive login");
        
        // Fallback to interactive popup for consent
        try {
          const interactiveRequest = {
            scopes: tokenRequest.scopes,
            account: accounts[0],
          };
          
          const response = await instance.acquireTokenPopup(interactiveRequest);
          console.debug("Token acquired via interactive popup with API scopes");
          return response.accessToken;
        } catch (popupError) {
          console.warn("Interactive token request failed, trying .default format");
        }
      }
      
      console.debug("Primary API scope request failed, trying .default format:", primaryError.message);
      
      // Fallback to .default scope format (appId/.default)
      try {
        const fallbackRequest = {
          scopes: tokenRequestWithAudience.scopes,
          account: accounts[0],
        };

        const response = await instance.acquireTokenSilent(fallbackRequest);
        console.debug("Token acquired with .default scope format");
        return response.accessToken;
      } catch (defaultError) {
        // If .default also fails, try interactive
        if (defaultError.errorCode === "consent_required" || defaultError.errorCode === "interaction_required") {
          console.warn("Consent required for .default scope, prompting for interactive login");
          
          const interactiveRequest = {
            scopes: tokenRequestWithAudience.scopes,
            account: accounts[0],
          };
          
          const response = await instance.acquireTokenPopup(interactiveRequest);
          console.debug("Token acquired via interactive popup with .default scope");
          return response.accessToken;
        }
        
        throw defaultError;
      }
    }
  } catch (error) {
    console.warn("Failed to acquire token for API:", error.message);
    return null;
  }
};

/**
 * Make HTTP requests with automatic error handling and token injection
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Response data
 * @throws {Error} With meaningful error message from API
 */
export const httpClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get access token and add to headers
  const accessToken = await getAccessToken();
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  // Add authorization header if token is available
  if (accessToken) {
    defaultOptions.headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
      // Handle 401 - possibly consent required
      if (response.status === 401) {
        const errorMessage = await extractErrorMessage(response);
        
        // Check if this is a consent error
        if (errorMessage.includes("consent") || errorMessage.includes("AADSTS65001")) {
          console.warn("API returned 401 - consent required");
        }
      }
      
      const errorMessage = await extractErrorMessage(response);
      throw new Error(errorMessage);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Log error for debugging
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    // Re-throw with the meaningful error message
    throw error;
  }
};

export default httpClient;
