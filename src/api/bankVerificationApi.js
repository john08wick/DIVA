const apiClient = require('../utils/apiClient');
const config = require('../config/apiConfig');

// Add logging utility
const logger = {
    info: (message, data = {}) => {
        console.log(`[BankVerificationAPI][INFO] ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = {}, data = {}) => {
        console.error(`[BankVerificationAPI][ERROR] ${message}`, {
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
        console.debug(`[BankVerificationAPI][DEBUG] ${message}`, JSON.stringify(data, null, 2));
    }
};

/**
 * Bank Account Verification API Service
 */
class BankVerificationAPI {
    constructor() {
        this.endpoints = config.endpoints.bank.verification;
        logger.info('BankVerificationAPI initialized', { endpoints: this.endpoints });
    }

    /**
     * Format verification response
     * @private
     * @param {Object} response Raw API response
     * @returns {Object} Formatted response
     */
    formatVerificationResponse(response) {
        logger.debug('Formatting verification response', { rawResponse: response });

        const formattedResponse = {
            success: ['APPROVED', 'PENDING_CHECKER_APPROVAL'].includes(response.status),
            status: response.status,
            subStatus: response.subStatus,
            utilityReferenceId: response.utilityReferenceId,
            opportunityId: response.opportunityId,
            bankDetails: response.data ? {
                accountHolder: response.data.nameAsPerBankAccount,
                accountNumber: response.data.bankAccountNumber,
                ifscCode: response.data.bankIfscCode,
                accountType: response.data.bankAccountType,
                bankName: response.data.bankName,
                nameMatchDetails: {
                    kycName: response.data.nameAsPerKYC,
                    panName: response.data.nameAsPerPan,
                    panNameMatchScore: response.data.panNameMatchPercentage,
                    kycNameMatchScore: response.data.kycNameMatchPercentage,
                    threshold: response.data.nameMatchThreshold
                },
                requiredDocuments: response.data.additionalDocumentsRequired
            } : null,
            verifierDetails: response.verifierData ? {
                provider: response.verifierData.verifier,
                referenceId: response.verifierData.verifierReferenceId
            } : null
        };

        logger.debug('Formatted verification response', { formattedResponse });
        return formattedResponse;
    }

    /**
     * Handle API errors
     * @private
     * @param {Error} error API error
     * @returns {Error} Formatted error
     */
    handleError(error) {
        logger.error('API error occurred', error);

        if (!error.response) {
            const networkError = new Error('Network error occurred');
            logger.error('Network error', networkError);
            return networkError;
        }

        const { status, data } = error.response;
        let formattedError;

        switch (status) {
            case 400:
                if (data.fenixErrorCode === 'INVALID_IFSC') {
                    formattedError = new Error('Invalid IFSC code provided');
                } else if (data.fenixErrorCode === 'BAD_REQUEST_INVALID_INPUT') {
                    formattedError = new Error(`Invalid input: ${JSON.stringify(data.violations)}`);
                } else if (data.fenixErrorCode === 'INVALID_REQUEST_UTILITY_DEPENDENCY') {
                    formattedError = new Error('KYC verification not completed');
                } else {
                    formattedError = new Error('Invalid request parameters');
                }
                break;
            case 401:
                formattedError = new Error('Authentication failed. Please check your credentials.');
                break;
            case 404:
                formattedError = new Error('Bank verification details not found');
                break;
            default:
                formattedError = new Error('An unexpected error occurred');
        }

        logger.error('Formatted error', formattedError, { originalError: error });
        return formattedError;
    }

    /**
     * Initiate bank account verification through penny drop
     * @param {Object} params Bank account verification parameters
     * @param {string} params.opportunityId Opportunity ID
     * @param {string} params.bankAccountNumber Bank account number
     * @param {string} params.ifscCode IFSC code of the bank
     * @param {string} params.bankName Name of the bank
     * @param {string} params.bankAccountType Type of bank account (e.g., 'SAVINGS_ACCOUNT')
     * @returns {Promise<Object>} Verification response
     */
    async initiateBankVerification(params) {
        logger.info('Initiating bank verification', { params });

        try {
            // Log the endpoint being called
            logger.debug('Making API call', {
                endpoint: this.endpoints.init,
                method: 'POST',
                params
            });

            const response = await apiClient.withRetry(() =>
                apiClient.post(this.endpoints.init, {
                    opportunityId: params.opportunityId,
                    bankAccountNumber: params.bankAccountNumber,
                    ifscCode: params.ifscCode,
                    bankName: params.bankName,
                    bankAccountType: params.bankAccountType
                })
            );

            logger.info('Bank verification initiated successfully', { 
                utilityReferenceId: response.utilityReferenceId,
                status: response.status 
            });

            return this.formatVerificationResponse(response);
        } catch (error) {
            logger.error('Failed to initiate bank verification', error, { params });
            throw this.handleError(error);
        }
    }

    /**
     * Get bank account verification status
     * @param {string} utilityReferenceId Reference ID from initiation response
     * @returns {Promise<Object>} Verification status
     */
    async getBankVerificationStatus(utilityReferenceId) {
        logger.info('Getting bank verification status', { utilityReferenceId });

        try {
            const endpoint = this.endpoints.status.replace(
                '{utilityReferenceId}',
                utilityReferenceId
            );

            logger.debug('Making API call', {
                endpoint,
                method: 'GET'
            });

            const response = await apiClient.withRetry(() =>
                apiClient.get(endpoint)
            );

            logger.info('Retrieved bank verification status', { 
                utilityReferenceId,
                status: response.status,
                subStatus: response.subStatus 
            });

            return this.formatVerificationResponse(response);
        } catch (error) {
            logger.error('Failed to get bank verification status', error, { utilityReferenceId });
            throw this.handleError(error);
        }
    }
}

// Export singleton instance
module.exports = new BankVerificationAPI(); 