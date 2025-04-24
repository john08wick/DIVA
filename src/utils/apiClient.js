const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const crypto = require('crypto');
const { getAuthHeaders } = require('./auth');
const apiConfig = require('../config/apiConfig');

// Custom error classes
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

// Create axios instance with base configuration for DSP APIs
const apiClient = axios.create({
    baseURL: apiConfig.getBaseUrl(),
    timeout: apiConfig.config.timeouts.default,
    headers: {
        ...apiConfig.config.headers
    }
});

// Create axios instance for chat assistant
const chatAssistantClient = axios.create({
    baseURL: apiConfig.getChatAssistantUrl(),
    timeout: apiConfig.config.timeouts.default,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Configure retry logic
axiosRetry(apiClient, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        // Retry on network errors
        if (axiosRetry.isNetworkError(error)) return true;
        
        // Retry on 5xx errors
        if (error.response && error.response.status >= 500) return true;
        
        // Retry on rate limits
        if (error.response && error.response.status === 429) return true;
        
        // Don't retry on client errors (4xx) except rate limits
        return false;
    }
});

// Configure retry logic for chat assistant
axiosRetry(chatAssistantClient, {
    retries: 2, // Less retries for chat
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: axiosRetry.isNetworkOrIdempotentRequestError
});

// Generate a random request ID
function generateRequestId() {
    return crypto.randomBytes(16).toString('hex');
}

// Request interceptor to add authentication headers
apiClient.interceptors.request.use(
    async config => {
        try {
            // Get authentication headers based on request method and body
            const authHeaders = await getAuthHeaders(
                config.method.toUpperCase(),
                config.data
            );
            
            // Add authentication headers to request, preserving case
            config.headers = {
                ...apiConfig.config.headers,
                ...authHeaders
            };
            
            // Add request ID for tracking
            config.headers['X-Request-ID'] = generateRequestId();
            
            // Log request details in development
            if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
                console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
                    headers: {
                        ...config.headers,
                        'X-Signature': '***' // Hide signature in logs
                    },
                    data: config.data
                });
            }

            // Debug log for all environments
            console.log('[API Debug] Final request headers:', {
                ...config.headers,
                'X-Signature': '***' // Hide signature in logs
            });
            
            return config;
        } catch (error) {
            // Convert auth setup errors to AuthenticationError
            throw new AuthenticationError(
                `Failed to set up authentication: ${error.message}`
            );
        }
    },
    error => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    response => {
        // Log response in development
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data
            });
        }
        return response.data;
    },
    async error => {
        // Log error in development
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
            console.error('[API Error]', {
                config: error.config,
                response: error.response?.data,
                message: error.message
            });
        }

        if (error.response) {
            const { status, data } = error.response;
            const message = data?.message || 'Unknown error';
            
            // Handle specific error status codes
            switch (status) {
                case 401:
                    throw new AuthenticationError(
                        'Authentication failed. Please check if DSP_SECRET_KEY and DSP_CHANNEL_CODE are configured.'
                    );
                case 403:
                    throw new ApiError(
                        'Access forbidden. You do not have permission to access this resource.',
                        status,
                        data
                    );
                case 404:
                    throw new ApiError(
                        'Resource not found. Please check the API endpoint.',
                        status,
                        data
                    );
                case 429:
                    throw new ApiError(
                        'Rate limit exceeded. Please try again later.',
                        status,
                        data
                    );
                default:
                    throw new ApiError(
                        `Request failed: ${message}`,
                        status,
                        data
                    );
            }
        } else if (error.request) {
            throw new ApiError(
                'No response received from server. Please check your network connection.',
                0
            );
        } else if (error instanceof AuthenticationError) {
            throw error; // Re-throw authentication errors
        } else {
            throw new ApiError(
                `Request setup failed: ${error.message}`,
                0
            );
        }
    }
);

// Helper method for retrying requests
const withRetry = async (requestFn) => {
    try {
        return await requestFn();
    } catch (error) {
        // If it's already been through the axios-retry process, just throw
        if (error.config && error.config['axios-retry']) {
            throw error;
        }
        
        // Create a new axios instance with retry config
        const retryClient = axios.create(apiClient.defaults);
        axiosRetry(retryClient, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay
        });
        
        // Execute the request with the retry-enabled client
        return retryClient(requestFn.config);
    }
};

// Helper methods for common API operations
const api = {
    // DSP API methods
    async get(endpoint, config = {}) {
        return apiClient.get(endpoint, config);
    },

    async post(endpoint, data = {}, config = {}) {
        return apiClient.post(endpoint, data, config);
    },

    async put(endpoint, data = {}, config = {}) {
        return apiClient.put(endpoint, data, config);
    },

    async delete(endpoint, config = {}) {
        return apiClient.delete(endpoint, config);
    },

    // Chat assistant methods
    async chatAssistant(message, config = {}) {
        return chatAssistantClient.post('/chat', { message }, config);
    },

    // Method for long-running requests
    async getLongRunning(endpoint, config = {}) {
        return apiClient.get(endpoint, {
            ...config,
            timeout: apiConfig.timeouts.long
        });
    },

    // Retry wrapper
    withRetry,

    // Error classes for external use
    AuthenticationError,
    ApiError
};

module.exports = api; 