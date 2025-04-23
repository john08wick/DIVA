const KfsApi = require('../api/kfsApi');
const logger = require('../utils/logger');

class KfsHandler {
    constructor() {
        this.kfsApi = new KfsApi();
    }

    async generateLoanContract(params) {
        try {
            // Validate parameters
            this.kfsApi.validateLoanContractParams(params);

            // Generate loan contract
            const result = await this.kfsApi.generateLoanContract(params.opportunityId, params);

            return {
                success: true,
                data: result,
                message: 'Loan contract generated successfully'
            };
        } catch (error) {
            logger.error('Failed to generate loan contract', {
                error: error.message,
                opportunityId: params.opportunityId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to generate loan contract'
            };
        }
    }

    async getLoanContractStatus(opportunityId) {
        try {
            const result = await this.kfsApi.getLoanContractStatus(opportunityId);

            // Handle different contract statuses
            switch (result.status) {
                case 'IN_PROGRESS':
                    if (result.redirectionURL) {
                        return {
                            success: true,
                            data: result,
                            message: 'Please redirect user to complete KFS and Agreement signing',
                            action: 'REDIRECT'
                        };
                    }
                    return {
                        success: true,
                        data: result,
                        message: 'KFS and Agreement signing is in progress'
                    };

                case 'COMPLETED':
                    return {
                        success: true,
                        data: result,
                        message: 'KFS and Agreement signing completed successfully',
                        action: 'PROCEED'
                    };

                case 'EXPIRED':
                    return {
                        success: true,
                        data: result,
                        message: 'KFS has expired. Please generate a new loan contract',
                        action: 'REGENERATE'
                    };

                default:
                    return {
                        success: false,
                        error: `Unknown contract status: ${result.status}`,
                        message: 'Failed to determine loan contract status'
                    };
            }
        } catch (error) {
            logger.error('Failed to get loan contract status', {
                error: error.message,
                opportunityId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to get loan contract status'
            };
        }
    }

    async handleLoanContractFlow(params) {
        try {
            // First check the current status
            const statusResult = await this.getLoanContractStatus(params.opportunityId);

            // If status check failed, return the error
            if (!statusResult.success) {
                return statusResult;
            }

            // Handle based on current status
            if (statusResult.data.status === 'EXPIRED' || !statusResult.data) {
                // Generate new contract if expired or not found
                return await this.generateLoanContract(params);
            } else if (statusResult.data.status === 'IN_PROGRESS') {
                // Return the existing status with redirection URL if available
                return statusResult;
            } else if (statusResult.data.status === 'COMPLETED') {
                // Contract is already completed
                return statusResult;
            }

            return {
                success: false,
                error: 'Invalid contract status',
                message: 'Unable to process loan contract'
            };
        } catch (error) {
            logger.error('Failed to handle loan contract flow', {
                error: error.message,
                opportunityId: params.opportunityId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to handle loan contract flow'
            };
        }
    }
}

module.exports = KfsHandler; 