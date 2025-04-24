/**
 * API Configuration
 */
const validateEnv = () => {
    const required = [
        'API_BASE_URL',
        'NODE_ENV',
        'OPENAI_API_KEY',
        'DSP_SECRET_KEY',
        'DSP_CHANNEL_CODE'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

const config = {
    // Base URLs for different environments
    baseUrls: {
        development: process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1',
        staging: process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1',
        production: process.env.API_BASE_URL || 'https://api.dspfin.com/los/api/v1'
    },

    // Chat assistant URL
    chatAssistant: {
        url: process.env.CHAT_ASSISTANT_URL || 'http://localhost:3000'
    },

    // API endpoints
    endpoints: {
        mutualFund: {
            fetch: {
                sendOTP: '/mutualFund/fetch/trigger-otp',
                validateOTP: '/mutualFund/fetch/{fetchRequestId}/validate-otp',
                getDetails: '/mutualFund/fetch/{fetchRequestId}'
            },
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
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60
    },

    // Default headers
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Get base URL based on current environment
const getBaseUrl = () => {
    const env = process.env.NODE_ENV || 'development';
    return config.baseUrls[env];
};

// Get chat assistant URL
const getChatAssistantUrl = () => {
    return config.chatAssistant.url;
};

// Validate environment variables on module load
validateEnv();

module.exports = {
    config,
    getBaseUrl,
    getChatAssistantUrl
}; 