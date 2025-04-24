/**
 * API Configuration
 */
const config = {
    // Base URLs for different environments
    baseUrls: {
        development: 'https://api.staging.dspfin.com/los/api/v1',
        staging: 'https://api.staging.dspfin.com/los/api/v1',
        production: 'https://api.staging.dspfin.com/los/api/v1'
    },

    // Chat assistant URL
    chatAssistant: {
        baseUrl: process.env.CHAT_ASSISTANT_URL || 'http://localhost:3000'
    },

    // API endpoints
    endpoints: {
        mutualFund: {
            sendOTP: '/mutualFund/fetch/trigger-otp',
            validateOTP: '/mutualFund/fetch/{fetchRequestId}/validate-otp',
            portfolioDetails: '/mutualFund/fetch/{fetchRequestId}',
            pledge: {
                sendOTP: '/mutualFund/pledge/trigger-otp',
                validateOTP: '/mutualFund/pledge/{pledgeRequestId}/verify-otp',
                getDetails: '/mutualFund/pledge/{pledgeRequestId}'
            }
        },
        bank: {
            verification: {
                init: '/utility/bank/verification/init',
                status: '/utility/bank/verification/{utilityReferenceId}'
            }
        }
    },

    // Request timeouts (in milliseconds)
    timeouts: {
        default: 30000,
        long: 60000
    },

    // Retry configuration
    retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000
    },

    // Rate limiting
    rateLimit: {
        maxRequestsPerMinute: 100
    }
};

// Get base URL based on current environment
const getBaseUrl = () => {
    // First try to get from environment variable
    if (process.env.API_BASE_URL) {
        return process.env.API_BASE_URL;
    }
    
    // Fall back to hardcoded URLs if environment variable is not set
    const env = process.env.NODE_ENV || 'development';
    return config.baseUrls[env];
};

// Get chat assistant URL
const getChatAssistantUrl = () => {
    return config.chatAssistant.baseUrl;
};

module.exports = {
    ...config,
    getBaseUrl,
    getChatAssistantUrl
}; 