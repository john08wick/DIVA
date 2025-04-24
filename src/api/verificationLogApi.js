const apiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

class VerificationLogApi {
    constructor() {
        this.baseURL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    }

    async createVerificationLog(params) {
        try {
            const response = await apiClient.post('/utility/verification/log', {
                customerConsent: {
                    approvalTimestamp: params.approvalTimestamp || Date.now(),
                    consent: params.consent,
                    consentStatus: params.consentStatus || 'APPROVED',
                    ipAddress: params.ipAddress
                },
                opportunityId: params.opportunityId,
                verificationMethod: params.verificationMethod,
                verificationRemarks: params.verificationRemarks,
                verificationStatus: params.verificationStatus,
                verificationTimestamp: params.verificationTimestamp || Date.now(),
                verificationType: params.verificationType,
                verifiedValue: params.verifiedValue
            });

            logger.info('Verification log created successfully', {
                opportunityId: params.opportunityId,
                verificationType: params.verificationType,
                status: response.data.status
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error creating verification log', {
                error: errorMessage,
                details: errorDetails,
                opportunityId: params.opportunityId,
                verificationType: params.verificationType
            });
            
            throw new Error(`Failed to create verification log: ${errorMessage}`);
        }
    }

    async getVerificationLogStatus(utilityReferenceId) {
        try {
            const response = await apiClient.get(`/utility/verification/log/${utilityReferenceId}`);

            logger.info('Retrieved verification log status successfully', {
                utilityReferenceId,
                status: response.data.status
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error getting verification log status', {
                error: errorMessage,
                details: errorDetails,
                utilityReferenceId
            });
            
            throw new Error(`Failed to get verification log status: ${errorMessage}`);
        }
    }

    validateVerificationLogParams(params) {
        const requiredFields = [
            'opportunityId',
            'verificationMethod',
            'verificationRemarks',
            'verificationStatus',
            'verificationType',
            'verifiedValue',
            'ipAddress'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate verificationType
        const validVerificationTypes = ['MOBILE', 'EMAIL'];
        if (!validVerificationTypes.includes(params.verificationType)) {
            throw new Error(`Invalid verificationType. Must be one of: ${validVerificationTypes.join(', ')}`);
        }

        // Validate verificationStatus
        const validVerificationStatuses = ['SUCCESS', 'FAILED', 'PENDING'];
        if (!validVerificationStatuses.includes(params.verificationStatus)) {
            throw new Error(`Invalid verificationStatus. Must be one of: ${validVerificationStatuses.join(', ')}`);
        }

        // Validate verificationMethod
        const validVerificationMethods = ['OTP', 'LINK', 'MANUAL'];
        if (!validVerificationMethods.includes(params.verificationMethod)) {
            throw new Error(`Invalid verificationMethod. Must be one of: ${validVerificationMethods.join(', ')}`);
        }

        // Validate email format if verificationType is EMAIL
        if (params.verificationType === 'EMAIL') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(params.verifiedValue)) {
                throw new Error('Invalid email format');
            }
        }

        // Validate mobile format if verificationType is MOBILE
        if (params.verificationType === 'MOBILE') {
            const mobileRegex = /^\d{10}$/;
            if (!mobileRegex.test(params.verifiedValue)) {
                throw new Error('Invalid mobile number format. Must be 10 digits');
            }
        }

        return true;
    }
}

module.exports = VerificationLogApi; 