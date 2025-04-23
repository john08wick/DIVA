const mfPledgeApi = require('../api/mutualFundPledgeApi');

/**
 * Handler for mutual fund pledge operations
 */
class MutualFundPledgeHandler {
    /**
     * Handle send OTP for pledge request
     * @param {Object} params Function parameters from OpenAI
     * @returns {Object} Response with pledge request details
     */
    async handleSendOTPPledge(params) {
        try {
            const response = await mfPledgeApi.sendOTPForPledge({
                opportunityId: params.opportunityId,
                fenixLoanAccountId: params.fenixLoanAccountId,
                provider: params.provider,
                mobileNumber: params.mobileNumber,
                funds: params.funds
            });

            if (response.status === 'REJECTED') {
                return {
                    success: false,
                    message: `Failed to send OTP: ${response.failureReason || response.subStatus}`,
                    data: response
                };
            }

            return {
                success: true,
                message: 'OTP sent successfully for pledge request',
                data: {
                    pledgeRequestId: response.utilityReferenceId,
                    status: response.status,
                    funds: response.funds
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error sending OTP: ${error.message}`,
                error: error
            };
        }
    }

    /**
     * Handle OTP validation for pledge request
     * @param {Object} params Function parameters from OpenAI
     * @returns {Object} Response with validation status
     */
    async handleValidateOTPPledge(params) {
        try {
            const response = await mfPledgeApi.validateOTP(
                params.pledgeRequestId,
                params.otp
            );

            return {
                success: response.status === 'SUCCESS',
                message: response.status === 'SUCCESS' 
                    ? 'OTP validated successfully'
                    : 'OTP validation failed',
                data: response
            };
        } catch (error) {
            return {
                success: false,
                message: `Error validating OTP: ${error.message}`,
                error: error
            };
        }
    }

    /**
     * Handle getting pledge details
     * @param {Object} params Function parameters from OpenAI
     * @returns {Object} Response with pledge details
     */
    async handleGetPledgeDetails(params) {
        try {
            const response = await mfPledgeApi.getPledgeDetails(params.pledgeRequestId);

            return {
                success: true,
                message: 'Pledge details retrieved successfully',
                data: {
                    status: response.status,
                    subStatus: response.subStatus,
                    funds: response.funds.map(fund => ({
                        isin: fund.isin,
                        folioNumber: fund.folioNumber,
                        pledgeStatus: fund.pledgeStatus,
                        units: fund.units,
                        schemeName: fund.schemeName,
                        remarks: fund.remarks
                    }))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Error fetching pledge details: ${error.message}`,
                error: error
            };
        }
    }
}

module.exports = new MutualFundPledgeHandler(); 