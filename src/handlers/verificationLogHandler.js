const VerificationLogApi = require('../api/verificationLogApi');
const logger = require('../utils/logger');

class VerificationLogHandler {
    constructor() {
        this.verificationLogApi = new VerificationLogApi();
    }

    async createVerificationLog(params) {
        try {
            // Validate parameters
            this.verificationLogApi.validateVerificationLogParams(params);

            // Create verification log
            const result = await this.verificationLogApi.createVerificationLog(params);

            return {
                success: true,
                data: result,
                message: `${params.verificationType} verification log created successfully`
            };
        } catch (error) {
            logger.error('Failed to create verification log', {
                error: error.message,
                opportunityId: params.opportunityId,
                verificationType: params.verificationType
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to create verification log'
            };
        }
    }

    async getVerificationLogStatus(utilityReferenceId) {
        try {
            const result = await this.verificationLogApi.getVerificationLogStatus(utilityReferenceId);

            return {
                success: true,
                data: result,
                message: 'Verification log status retrieved successfully'
            };
        } catch (error) {
            logger.error('Failed to get verification log status', {
                error: error.message,
                utilityReferenceId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to get verification log status'
            };
        }
    }

    async handleEmailVerification(params) {
        try {
            const verificationParams = {
                ...params,
                verificationType: 'EMAIL',
                verificationMethod: params.verificationMethod || 'LINK',
                verificationRemarks: params.verificationRemarks || 'Email verification completed',
                verificationStatus: params.verificationStatus || 'SUCCESS',
                verificationTimestamp: Date.now(),
                customerConsent: {
                    approvalTimestamp: Date.now(),
                    consentStatus: 'APPROVED',
                    ipAddress: params.ipAddress
                }
            };

            return await this.createVerificationLog(verificationParams);
        } catch (error) {
            logger.error('Failed to handle email verification', {
                error: error.message,
                opportunityId: params.opportunityId,
                email: params.verifiedValue
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to handle email verification'
            };
        }
    }

    async handleMobileVerification(params) {
        try {
            const verificationParams = {
                ...params,
                verificationType: 'MOBILE',
                verificationMethod: params.verificationMethod || 'OTP',
                verificationRemarks: params.verificationRemarks || 'Mobile verification completed',
                verificationStatus: params.verificationStatus || 'SUCCESS',
                verificationTimestamp: Date.now(),
                customerConsent: {
                    approvalTimestamp: Date.now(),
                    consentStatus: 'APPROVED',
                    ipAddress: params.ipAddress
                }
            };

            return await this.createVerificationLog(verificationParams);
        } catch (error) {
            logger.error('Failed to handle mobile verification', {
                error: error.message,
                opportunityId: params.opportunityId,
                mobile: params.verifiedValue
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to handle mobile verification'
            };
        }
    }
}

module.exports = VerificationLogHandler; 