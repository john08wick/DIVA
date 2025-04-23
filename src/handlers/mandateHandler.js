const MandateAPI = require('../api/mandateApi');
const logger = require('../utils/logger');

class MandateHandler {
    constructor() {
        this.mandateApi = new MandateAPI();
    }

    async initiateMandateSetup(params) {
        try {
            // Validate inputs
            if (!this.validateInitiateParams(params)) {
                throw new Error('Invalid parameters for mandate setup');
            }

            const response = await this.mandateApi.initiateMandateSetup(params);
            
            return {
                success: true,
                message: 'Mandate setup initiated successfully',
                data: {
                    utilityReferenceId: response.utilityReferenceId,
                    status: response.status,
                    webUrl: response.webUrl,
                    verifierData: response.verifierData
                }
            };
        } catch (error) {
            logger.error('Error in mandate setup handler', {
                error: error.message,
                params
            });
            return {
                success: false,
                message: error.message,
                error: error.response?.data || error.message
            };
        }
    }

    async getMandateStatus(utilityReferenceId) {
        try {
            if (!utilityReferenceId) {
                throw new Error('Utility reference ID is required');
            }

            const response = await this.mandateApi.getMandateStatus(utilityReferenceId);
            
            return {
                success: true,
                message: 'Mandate status retrieved successfully',
                data: {
                    status: response.status,
                    subStatus: response.subStatus,
                    bankAccountDetails: response.data?.bankAccountDetails,
                    mandateStatus: response.data?.mandateStatus
                }
            };
        } catch (error) {
            logger.error('Error in get mandate status handler', {
                error: error.message,
                utilityReferenceId
            });
            return {
                success: false,
                message: error.message,
                error: error.response?.data || error.message
            };
        }
    }

    async registerMandate(opportunityId, params) {
        try {
            // Validate inputs
            if (!this.validateRegisterParams(params)) {
                throw new Error('Invalid parameters for mandate registration');
            }

            const response = await this.mandateApi.registerMandate(opportunityId, params);
            
            return {
                success: true,
                message: 'Mandate registered successfully',
                data: {
                    utilityReferenceId: response.utilityReferenceId,
                    status: response.status,
                    subStatus: response.subStatus
                }
            };
        } catch (error) {
            logger.error('Error in register mandate handler', {
                error: error.message,
                opportunityId,
                params
            });
            return {
                success: false,
                message: error.message,
                error: error.response?.data || error.message
            };
        }
    }

    validateInitiateParams(params) {
        const { opportunityId, bankAccountVerificationId, endDate, mandateType, mandateAmount } = params;
        
        if (!opportunityId || !bankAccountVerificationId || !endDate || !mandateType || !mandateAmount) {
            return false;
        }

        return (
            this.mandateApi.validateMandateType(mandateType) &&
            this.mandateApi.validateEndDate(endDate) &&
            this.mandateApi.validateMandateAmount(mandateAmount)
        );
    }

    validateRegisterParams(params) {
        const { 
            bankAccountVerificationId, 
            endDate, 
            startDate, 
            mandateType, 
            mandateAmount, 
            mandateFrequency,
            umrn 
        } = params;

        if (!bankAccountVerificationId || !endDate || !startDate || !mandateType || 
            !mandateAmount || !mandateFrequency || !umrn) {
            return false;
        }

        return (
            this.mandateApi.validateMandateType(mandateType) &&
            this.mandateApi.validateMandateFrequency(mandateFrequency) &&
            this.mandateApi.validateEndDate(endDate) &&
            this.mandateApi.validateMandateAmount(mandateAmount)
        );
    }

    getStatusDescription(status, subStatus) {
        const statusMap = {
            'IN_PROGRESS': {
                'IN_PROGRESS': 'The mandate setup is in progress'
            },
            'APPROVED': {
                'MANDATE_SUCCESS': 'Mandate setup completed successfully',
                'REGISTRATION_SUCCESS': 'Mandate registration successful',
                'AUTH_SUCCESS': 'Mandate authentication successful',
                'NPCI_ACCEPT': 'Mandate accepted by NPCI'
            },
            'REJECTED': {
                'CHECKER_REJECTED': 'Mandate rejected by checker',
                'AUTHENTICATION_FAIL': 'Mandate authentication failed',
                'MANDATE_EXPIRED': 'Mandate has expired',
                'CANCELLED': 'Mandate was cancelled',
                'REVOKED': 'Mandate was revoked',
                'AUTH_FAILED': 'Mandate authentication failed',
                'NPCI_REJECT': 'Mandate rejected by NPCI',
                'REGISTRATION_FAILED': 'Mandate registration failed'
            },
            'FAILED': {
                'FAILED': 'Mandate setup failed'
            }
        };

        return statusMap[status]?.[subStatus] || 'Unknown status';
    }
}

module.exports = MandateHandler; 