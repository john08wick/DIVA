const axios = require('axios');
const axiosRetry = require('axios-retry').default;
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

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1',
    timeout: apiConfig.timeouts.default
});

// Configure retry behavior
axiosRetry(apiClient, {
    retries: apiConfig.retry.maxAttempts,
    retryDelay: (retryCount) => {
        return Math.min(
            apiConfig.retry.initialDelay * Math.pow(apiConfig.retry.backoffFactor, retryCount - 1),
            apiConfig.retry.maxDelay
        );
    },
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status === 429);
    }
});

// Request interceptor to add authentication headers
apiClient.interceptors.request.use(
    async config => {
        try {
            // Get authentication headers based on request method and body
            const authHeaders = await getAuthHeaders(
                config.method.toUpperCase(),
                config.data
            );
            
            // Add authentication headers to request
            config.headers = {
                'Accept': '*/*',
                'Content-Type': 'application/json',
                ...authHeaders
            };
            
            // Log the request details
            console.log('API Request Details:', {
                baseURL: config.baseURL,
                url: config.url,
                method: config.method,
                headers: config.headers
            });
            
            return config;
        } catch (error) {
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
    response => response.data,
    error => {
        if (error.response) {
            throw new ApiError(
                error.response.data.message || 'API request failed',
                error.response.status,
                error.response.data
            );
        }
        throw error;
    }
);

module.exports = apiClient; 