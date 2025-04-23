const apiClient = require('../utils/apiClient');
const config = require('../config/apiConfig');

class MutualFundPledgeAPI {
    constructor() {
        this.endpoints = config.endpoints.mutualFund.pledge;
    }

    /**
     * Send OTP for pledging mutual funds
     * @param {Object} params - Parameters for sending OTP
     * @param {string} params.opportunityId - Opportunity ID
     * @param {string} [params.fenixLoanAccountId] - Optional Fenix loan account ID
     * @param {string} params.provider - Provider (CAMS/KFIN)
     * @param {string} params.mobileNumber - User's mobile number
     * @param {Array} params.funds - Array of funds to pledge
     * @returns {Promise<Object>} Response containing pledge request details
     */
    async sendOTPForPledge(params) {
        return apiClient.withRetry(() =>
            apiClient.post(this.endpoints.sendOTP, params)
        );
    }

    /**
     * Validate OTP for mutual fund pledge
     * @param {string} pledgeRequestId - Pledge request ID (PDRID)
     * @param {string} otp - OTP received by user
     * @returns {Promise<Object>} Response containing validation status
     */
    async validateOTP(pledgeRequestId, otp) {
        const endpoint = this.endpoints.validateOTP.replace('{pledgeRequestId}', pledgeRequestId);
        return apiClient.withRetry(() =>
            apiClient.post(endpoint, { OTP: otp })
        );
    }

    /**
     * Get pledge details
     * @param {string} pledgeRequestId - Pledge request ID (PDRID)
     * @returns {Promise<Object>} Response containing pledge details
     */
    async getPledgeDetails(pledgeRequestId) {
        const endpoint = this.endpoints.getDetails.replace('{pledgeRequestId}', pledgeRequestId);
        return apiClient.withRetry(() =>
            apiClient.get(endpoint)
        );
    }
}

// Export singleton instance
module.exports = new MutualFundPledgeAPI(); 