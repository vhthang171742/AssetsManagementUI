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
 * Parse unified API error envelope from response
 * All error responses follow: { success, statusCode, message, errors, data }
 * @param {Response} response - Fetch response object
 * @returns {Promise<{message: string, errors: string[], statusCode: number}>}
 */
const parseErrorResponse = async (response) => {
  try {
    const body = await response.json();
    return {
      message: body?.message || getStatusMessage(response.status),
      errors: Array.isArray(body?.errors) ? body.errors : [],
      statusCode: body?.statusCode || response.status,
    };
  } catch {
    // Non-JSON response (e.g., gateway/proxy errors)
    return {
      message: getStatusMessage(response.status),
      errors: [],
      statusCode: response.status,
    };
  }
};

/**
 * Get user-friendly error message based on HTTP status code
 * @param {number} status - HTTP status code
 * @returns {string} User-friendly error message
 */
const getStatusMessage = (status) => {
  switch (status) {
    case 400:
      return "Bad request. Please check your input.";
    case 401:
      return "Unauthorized. Please log in again.";
    case 403:
      return "Access denied. You don't have permission to perform this action.";
    case 404:
      return "Resource not found.";
    case 409:
      return "Conflict. The resource may already exist or is in use.";
    case 500:
      return "Internal server error. Please try again later.";
    case 503:
      return "Service unavailable. Please try again later.";
    default:
      return `Request failed with status ${status}`;
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
        console.warn("Consent required for API scopes, prompting for interactive login via redirect");
        
        // Fallback to interactive redirect for consent (better for mobile)
        try {
          const interactiveRequest = {
            scopes: tokenRequest.scopes,
            account: accounts[0],
          };
          
          await instance.acquireTokenRedirect(interactiveRequest);
          console.debug("Token acquisition via redirect initiated with API scopes");
          // Note: The page will be redirected to Azure AD and back
          // The token will be available after redirect
          return null; // Return null as we're redirecting
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
        // If .default also fails, try interactive redirect
        if (defaultError.errorCode === "consent_required" || defaultError.errorCode === "interaction_required") {
          console.warn("Consent required for .default scope, prompting for interactive login via redirect");
          
          const interactiveRequest = {
            scopes: tokenRequestWithAudience.scopes,
            account: accounts[0],
          };
          
          await instance.acquireTokenRedirect(interactiveRequest);
          console.debug("Token acquisition via redirect initiated with .default scope");
          // Note: The page will be redirected to Azure AD and back
          // The token will be available after redirect
          return null; // Return null as we're redirecting
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

  // Read language preference from localStorage (set by LanguageContext)
  const language = localStorage.getItem("app_language") || "en-US";

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": language,
      ...options.headers,
    },
  };

  // Add authorization header if token is available
  if (accessToken) {
    defaultOptions.headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    // Handle 204 No Content responses (e.g., DELETE)
    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      // Handle 401 - possibly consent required
      if (response.status === 401) {
        const { message } = await parseErrorResponse(response.clone());
        if (message.includes("consent") || message.includes("AADSTS65001")) {
          console.warn("API returned 401 - consent required");
        }
      }

      const { message, errors, statusCode } = await parseErrorResponse(response);
      const error = new Error(message);
      error.statusCode = statusCode;
      error.errors = errors;
      throw error;
    }

    // Parse unified envelope: { success, statusCode, message, errors, data }
    const body = await response.json();
    return body.data;
  } catch (error) {
    // Log error for debugging
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    // Re-throw with the meaningful error message
    throw error;
  }
};

export default httpClient;
