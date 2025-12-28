/**
 * Token Request Helper
 * Handles token acquisition with consent prompts and fallback strategies
 */
import { PublicClientApplication } from "@azure/msal-browser";
import msalConfig, { tokenRequest, tokenRequestWithAudience, loginRequest } from "config/msalConfig";

let msalInstance = null;

const getMsalInstance = () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
};

const hasApiScopes = () => {
  const primary = Array.isArray(tokenRequest?.scopes) ? tokenRequest.scopes.length : 0;
  const fallback = Array.isArray(tokenRequestWithAudience?.scopes) ? tokenRequestWithAudience.scopes.length : 0;
  return primary > 0 || fallback > 0;
};

/**
 * Request consent for API scopes if needed
 * This should be called once during app initialization
 */
export const requestApiConsent = async () => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      console.warn("No accounts found, skipping consent request");
      return false;
    }

    if (!hasApiScopes()) {
      console.warn("API scopes are not configured. Skipping API consent. Set REACT_APP_API_APP_ID and scopes in .env.");
      return false;
    }

    // Try to acquire token for API scopes with popup
    const consentRequest = {
      scopes: tokenRequest.scopes,
      account: accounts[0],
      prompt: "consent", // Force consent screen
    };

    try {
      const response = await instance.acquireTokenPopup(consentRequest);
      console.log("API scope consent granted");
      return true;
    } catch (error) {
      if (error.errorCode === "user_cancelled") {
        console.warn("User cancelled consent");
        return false;
      }
      
      // Try .default format if primary scopes fail
      console.warn("Primary scope consent failed, trying .default format");
      
      const fallbackRequest = {
        scopes: tokenRequestWithAudience.scopes,
        account: accounts[0],
        prompt: "consent",
      };
      
      const fallbackResponse = await instance.acquireTokenPopup(fallbackRequest);
      console.log("API scope consent granted with .default format");
      return true;
    }
  } catch (error) {
    console.error("Consent request failed:", error.message);
    return false;
  }
};

/**
 * Try to acquire token with automatic consent if needed
 * More aggressive than silent-only approach
 */
export const acquireTokenForApi = async (forceInteractive = false) => {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();

    if (accounts.length === 0) {
      return null;
    }

    if (!hasApiScopes()) {
      console.warn("API scopes are not configured. Cannot acquire API token. Configure REACT_APP_API_APP_ID and REACT_APP_API_SCOPE(S) in .env.");
      return null;
    }

    if (forceInteractive) {
      // Force interactive popup for consent
      try {
        const response = await instance.acquireTokenPopup({
          scopes: tokenRequest.scopes,
          account: accounts[0],
        });
        return response; // Return full response, not just accessToken
      } catch (error) {
        console.warn("Popup token request failed:", error.message);
        return null;
      }
    }

    // Try silent first
    try {
      const response = await instance.acquireTokenSilent({
        scopes: tokenRequest.scopes,
        account: accounts[0],
      });
      return response; // Return full response, not just accessToken
    } catch (error) {
      // If consent is required, switch to interactive
      if (
        error.errorCode === "consent_required" ||
        error.errorCode === "interaction_required" ||
        error.errorCode === "AADSTS65001"
      ) {
        console.warn("Consent required, switching to interactive mode");
        
        try {
          const response = await instance.acquireTokenPopup({
            scopes: tokenRequest.scopes,
            account: accounts[0],
          });
          return response; // Return full response
        } catch (popupError) {
          console.error("Interactive popup failed:", popupError.message);
          return null;
        }
      }

      // Try .default format
      try {
        const response = await instance.acquireTokenSilent({
          scopes: tokenRequestWithAudience.scopes,
          account: accounts[0],
        });
        return response; // Return full response
      } catch (defaultError) {
        if (
          defaultError.errorCode === "consent_required" ||
          defaultError.errorCode === "interaction_required"
        ) {
          try {
            const response = await instance.acquireTokenPopup({
              scopes: tokenRequestWithAudience.scopes,
              account: accounts[0],
            });
            return response; // Return full response
          } catch (popupError) {
            console.error("Interactive popup with .default failed:", popupError.message);
            return null;
          }
        }
        
        throw defaultError;
      }
    }
  } catch (error) {
    console.error("Failed to acquire token:", error.message);
    return null;
  }
};

export default {
  requestApiConsent,
  acquireTokenForApi,
  getMsalInstance,
};
