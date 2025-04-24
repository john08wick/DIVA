const api = require('../utils/apiClient');
const logger = require('../utils/logger');

class LoanContractAPI {
    async generateLoanContract(opportunityId, params) {
        try {
            logger.info('Generating loan contract', { opportunityId, params });
            const response = await api.post(`/los/api/v1/opportunity/${opportunityId}/loan/contract`, params);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('Error generating loan contract', error);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    async getLoanContractStatus(opportunityId) {
        try {
            logger.info('Getting loan contract status', { opportunityId });
            const response = await api.get(`/los/api/v1/opportunity/${opportunityId}/loan/contract/status`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            logger.error('Error getting loan contract status', error);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    formatLoanContractRequest(params) {
        return {
            kfsRequest: {
                creditLimit: params.creditLimit,
                sanctionLimit: params.sanctionLimit,
                interestRate: params.interestRate,
                tenure: params.tenure,
                feeDetails: {
                    processingFee: params.processingFee,
                    enhanceLimitFee: params.enhanceLimitFee || 0,
                    renewalFee: params.renewalFee || 0,
                    marginPledgeFee: params.marginPledgeFee || 0
                }
            },
            agreementRequest: {
                kycReferenceId: params.kycReferenceId,
                additionalUtilityReferenceId: params.additionalUtilityReferenceId,
                photoUtilityReferenceId: params.photoUtilityReferenceId,
                bankAccountReferenceId: params.bankAccountReferenceId
            },
            redirectionUrl: params.redirectionUrl
        };
    }

    validateLoanContractParams(params) {
        const requiredFields = [
            'creditLimit',
            'sanctionLimit',
            'interestRate',
            'tenure',
            'processingFee',
            'enhanceLimitFee',
            'renewalFee',
            'marginPledgeFee',
            'kycReferenceId',
            'additionalUtilityReferenceId',
            'photoUtilityReferenceId',
            'bankAccountReferenceId'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        if (params.tenure < 1 || params.tenure > 360) {
            throw new Error('Tenure must be between 1 and 360 months');
        }

        if (params.interestRate < 0 || params.interestRate > 100) {
            throw new Error('Interest rate must be between 0 and 100');
        }

        return true;
    }
}

module.exports = new LoanContractAPI(); 