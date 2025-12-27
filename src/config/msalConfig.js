import { LogLevel } from "@azure/msal-browser";

/**
 * MSAL Configuration
 *
 * You need to register your application in Azure AD Portal:
 * 1. Go to https://portal.azure.com/
 * 2. Navigate to Azure Active Directory > App registrations > New registration
 * 3. Set Redirect URI: http://localhost:3000 (for development)
 *    For production: https://yourdomain.com
 * 4. Copy the Application (client) ID and use it below as clientId
 * 5. Create Tenant ID by copying the Directory (tenant) ID
 */

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_MSAL_CLIENT_ID,
    authority: process.env.REACT_APP_MSAL_AUTHORITY,
    redirectUri: process.env.REACT_APP_MSAL_REDIRECT_URI,
    postLogoutRedirectUri: process.env.REACT_APP_MSAL_POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

/**
 * Scopes for Microsoft Graph API
 * These allow us to read user profile information
 */
export const graphScopes = ["user.read", "profile", "email"];

/**
 * API App ID from environment
 * Get this from Azure AD app registration
 */
const apiAppId = process.env.REACT_APP_API_APP_ID;
const rawApiScopes = process.env.REACT_APP_API_SCOPES;
const configuredScopeList = rawApiScopes
  ? rawApiScopes.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

if (!apiAppId) {
  console.warn(
    "REACT_APP_API_APP_ID is not set. API scopes will be omitted from login. Set it to avoid AADSTS500011 (api://undefined)."
  );
}

/**
 * API Scopes for Asset Management
 */
// Build API scopes safely:
// - If apiAppId is defined and scopes are provided via env, normalize them
// - If apiAppId is defined and no scopes provided, use sensible defaults
// - If apiAppId is missing, include only fully-qualified scopes provided (starting with api://); else omit
const apiScopes = (() => {
  if (apiAppId) {
    if (configuredScopeList.length > 0) {
      return configuredScopeList.map((s) =>
        s.startsWith("api://") ? s : `api://${apiAppId}/${s}`
      );
    }
  } else {
    // No app ID: only accept already-qualified scopes; otherwise return empty
    return configuredScopeList.filter((s) => s.startsWith("api://"));
  }
})();

/**
 * Login request configuration
 * Includes both Graph scopes (for user profile) AND API scopes (for asset management)
 * This ensures users grant consent to both during initial sign-in
 */
export const loginRequest = {
  scopes: [...graphScopes, ...apiScopes],
};

/**
 * Access token request configuration for API calls
 * Your backend API is registered in Azure AD with the following scopes
 * IMPORTANT: Use full URI format (api://{appId}/{scope}) for custom APIs
 */
export const tokenRequest = {
  scopes: apiScopes.length ? apiScopes : [],
};

/**
 * Alternative token request with audience (some APIs require this format)
 * Use this if the above format doesn't work
 */
export const tokenRequestWithAudience = {
  scopes: apiAppId ? [`${apiAppId}/.default`] : [],
};

/**
 * API Audience (aud claim in JWT token)
 * Used for token validation on the backend
 */
export const apiAudience = apiAppId ? `api://${apiAppId}` : null;

export default msalConfig;
