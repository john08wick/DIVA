const { default: axios } = require('axios');
const config = require('../config/apiConfig');
const apiClient = require('../utils/apiClient');

// Add logging utility
const logger = {
    info: (message, data = {}) => {
        console.log(`[MutualFundFetchAPI][INFO] ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = {}, data = {}) => {
        console.error(`[MutualFundFetchAPI][ERROR] ${message}`, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                response: error.response?.data
            },
            data
        });
    },
    debug: (message, data = {}) => {
        console.debug(`[MutualFundFetchAPI][DEBUG] ${message}`, JSON.stringify(data, null, 2));
    }
};

/**
 * Mutual Fund Portfolio Fetch API Service
 */
class MutualFundFetchAPI {
    constructor() {
        this.endpoints = config.endpoints.mutualFund;
        logger.info('MutualFundFetchAPI initialized', { endpoints: this.endpoints });
    }

    /**
     * Format portfolio response
     * @private
     * @param {Object} response Raw API response
     * @returns {Object} Formatted response
     */
    formatPortfolioResponse(response) {
        logger.debug('Formatting portfolio response', { rawResponse: response });

        const formattedResponse = {
            success: response.status === 'SUCCESS',
            status: response.status,
            subStatus: response.subStatus,
            fetchRequestId: response.utilityReferenceId,
            portfolioDetails: response.data ? {
                totalValue: response.data.totalValue,
                lastUpdated: response.data.lastUpdated,
                funds: response.data.funds.map(fund => ({
                    isin: fund.isin,
                    folioNumber: fund.folioNumber,
                    schemeName: fund.schemeName,
                    units: fund.units,
                    currentValue: fund.currentValue,
                    nav: fund.nav,
                    navDate: fund.navDate,
                    provider: fund.provider
                }))
            } : null
        };

        logger.debug('Formatted portfolio response', { formattedResponse });
        return formattedResponse;
    }

    /**
     * Handle API errors
     * @private
     * @param {Error} error API error
     * @returns {Error} Formatted error
     */
    handleError(error) {
        logger.error('API error occurred', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                data: error.config?.data
            }
        });

        if (!error.response) {
            const networkError = new Error(`Network error occurred: ${error.message}`);
            logger.error('Network error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return networkError;
        }

        const { status, data } = error.response;
        let formattedError;

        switch (status) {
            case 400:
                if (data.fenixErrorCode === 'INVALID_PAN') {
                    formattedError = new Error('Invalid PAN provided');
                } else if (data.fenixErrorCode === 'INVALID_MOBILE') {
                    formattedError = new Error('Invalid mobile number provided');
                } else {
                    formattedError = new Error(`Invalid request parameters: ${JSON.stringify(data)}`);
                }
                break;
            case 401:
                formattedError = new Error('Authentication failed. Please check your credentials.');
                break;
            case 404:
                formattedError = new Error('Portfolio details not found');
                break;
            default:
                formattedError = new Error(`An unexpected error occurred: ${JSON.stringify(data)}`);
        }

        logger.error('Formatted error details:', {
            error: formattedError,
            originalError: {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            }
        });
        return formattedError;
    }

    /**
     * Send OTP for fetching mutual fund portfolio
     * @param {Object} params Parameters for sending OTP
     * @param {string} params.pan PAN number
     * @param {string} params.mobileNumber Mobile number
     * @param {string} params.provider Provider (e.g., MFC)
     * @returns {Promise<Object>} Response containing fetch request details
     */
    async sendOTPForMFPortfolio(params) {
        logger.info('Sending OTP for MF portfolio fetch', { params });

        try {
            logger.debug('Making API call', apiClient);

            const response = await apiClient.post(this.endpoints.sendOTP, {
                pan: params.pan,
                mobileNumber: params.mobileNumber,
                provider: params.provider
            });

            logger.info('OTP sent successfully', {
                fetchRequestId: response.utilityReferenceId,
                status: response.status
            });

            return response;
        } catch (error) {
            logger.error('Failed to send OTP', error, { params });
            throw this.handleError(error);
        }
    }

    /**
     * Validate OTP for mutual fund portfolio fetch
     * @param {string} fetchRequestId Fetch request ID
     * @param {string} otp OTP received by user
     * @returns {Promise<Object>} Response containing validation status
     */
    async validateOTPForMFPortfolio(fetchRequestId, otp) {
        logger.info('Validating OTP for MF portfolio fetch', { fetchRequestId });

        try {
            const endpoint = this.endpoints.validateOTP.replace('{fetchRequestId}', fetchRequestId);
            
            logger.debug('Making API call', {
                endpoint,
                method: 'POST'
            });
            console.log(" 2222", otp);

            const response = await apiClient.post(endpoint, {
                otp: otp,
                fetchRequestId: fetchRequestId
            });

            logger.info('OTP validated successfully', {
                fetchRequestId,
                status: response.status
            });

            return response;
        } catch (error) {
            logger.error('Failed to validate OTP', error, { fetchRequestId });
            throw this.handleError(error);
        }
    }

    /**
     * Get mutual fund portfolio details
     * @param {string} fetchRequestId Fetch request ID
     * @returns {Promise<Object>} Response containing portfolio details
     */
    async getMFPortfolioDetails(fetchRequestId) {
        logger.info('Getting MF portfolio details', { fetchRequestId });

        try {

            const endpoint = this.endpoints.portfolioDetails.replace('{fetchRequestId}', fetchRequestId);
            
            logger.debug('Making API call', {
                endpoint,
                method: 'GET'
            });

            const response = await apiClient.get(endpoint);

            logger.info('Retrieved portfolio details successfully', {
                fetchRequestId,
                status: response.status
            });

            return response;
        } catch (error) {
            logger.error('Failed to get portfolio details', error, { fetchRequestId });
            throw this.handleError(error);
        }
    }
}

// Export singleton instance
module.exports = MutualFundFetchAPI; 