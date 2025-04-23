const bankVerificationApi = require('../api/bankVerificationApi');

/**
 * Handler for bank verification operations
 */
class BankVerificationHandler {
    /**
     * Handle bank verification initiation
     * @param {Object} params Function parameters from OpenAI
     * @returns {Object} Response with verification details
     */
    async handleInitiateBankVerification(params) {
        try {
            const response = await bankVerificationApi.initiateBankVerification(params);

            if (!response.success) {
                return {
                    success: false,
                    message: `Bank verification failed: ${response.subStatus}`,
                    data: response
                };
            }

            let message = 'Bank verification initiated successfully.';
            if (response.bankDetails?.requiredDocuments) {
                message += ` Additional documents required: ${response.bankDetails.requiredDocuments.join(', ')}`;
            }

            if (response.bankDetails?.nameMatchDetails) {
                const { panNameMatchScore, kycNameMatchScore, threshold } = response.bankDetails.nameMatchDetails;
                if (panNameMatchScore < threshold || kycNameMatchScore < threshold) {
                    message += `\nName match scores below threshold (${threshold}%):`;
                    message += `\n- PAN Name Match: ${panNameMatchScore}%`;
                    message += `\n- KYC Name Match: ${kycNameMatchScore}%`;
                }
            }

            return {
                success: true,
                message,
                data: {
                    utilityReferenceId: response.utilityReferenceId,
                    status: response.status,
                    bankDetails: response.bankDetails
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error initiating bank verification: ${error.message}`,
                error: error
            };
        }
    }

    /**
     * Handle getting bank verification status
     * @param {Object} params Function parameters from OpenAI
     * @returns {Object} Response with verification status
     */
    async handleGetBankVerificationStatus(params) {
        try {
            const response = await bankVerificationApi.getBankVerificationStatus(
                params.utilityReferenceId
            );

            let message = `Bank verification status: ${response.status}`;
            if (response.subStatus) {
                message += ` (${response.subStatus})`;
            }

            if (response.bankDetails?.requiredDocuments) {
                message += `\nRequired documents: ${response.bankDetails.requiredDocuments.join(', ')}`;
            }

            return {
                success: response.success,
                message,
                data: {
                    status: response.status,
                    subStatus: response.subStatus,
                    bankDetails: response.bankDetails
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error getting bank verification status: ${error.message}`,
                error: error
            };
        }
    }
}

// Export singleton instance
module.exports = new BankVerificationHandler(); 