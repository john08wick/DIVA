const apiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

class KfsApi {
    constructor() {
        this.baseURL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    }

    async generateLoanContract(opportunityId, params) {
        try {
            const response = await apiClient.post(`/opportunity/${opportunityId}/loan/contract`, {
                kfsRequest: {
                    creditLimit: params.creditLimit,
                    sanctionLimit: params.sanctionLimit,
                    interestRate: params.interestRate,
                    tenure: params.tenure,
                    feeDetails: {
                        processingFee: params.processingFee,
                        enhanceLimitFee: params.enhanceLimitFee,
                        renewalFee: params.renewalFee,
                        marginPledgeFee: params.marginPledgeFee
                    }
                },
                agreementRequest: {
                    kycReferenceId: params.kycReferenceId,
                    additionalUtilityReferenceId: params.additionalUtilityReferenceId,
                    photoUtilityReferenceId: params.photoUtilityReferenceId,
                    bankAccountReferenceId: params.bankAccountReferenceId
                },
                redirectionUrl: params.redirectionUrl || 'https://www.voltmoney.in'
            });

            logger.info('Loan contract generated successfully', {
                opportunityId,
                status: response.data.status
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error generating loan contract', {
                error: errorMessage,
                details: errorDetails,
                opportunityId,
                requestData: {
                    creditLimit: params.creditLimit,
                    sanctionLimit: params.sanctionLimit,
                    interestRate: params.interestRate,
                    tenure: params.tenure
                }
            });
            
            throw new Error(`Failed to generate loan contract: ${errorMessage}`);
        }
    }

    async getLoanContractStatus(opportunityId) {
        try {
            const response = await apiClient.get(`/opportunity/${opportunityId}/loan/contract/status`);
            
            if (!response.data) {
                throw new Error('No data received from API');
            }

            logger.info('Retrieved loan contract status successfully', {
                opportunityId,
                status: response.data.status,
                responseData: response.data
            });

            // Return the entire response data object
            return {
                status: response.data.status || 'UNKNOWN',
                opportunityId: response.data.opportunityId,
                redirectionURL: response.data.redirectionURL,
                steps: response.data.steps || []
            };
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error getting loan contract status', {
                error: errorMessage,
                details: errorDetails,
                opportunityId
            });
            
            throw new Error(`Failed to get loan contract status: ${errorMessage}`);
        }
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

module.exports = KfsApi; 