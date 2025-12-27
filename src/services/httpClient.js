/**
 * HTTP Client for API calls with centralized error handling
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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
 * Make HTTP requests with automatic error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Response data
 * @throws {Error} With meaningful error message from API
 */
export const httpClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });

    if (!response.ok) {
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
