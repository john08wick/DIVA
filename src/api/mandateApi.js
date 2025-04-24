const apiClient = require('../utils/apiClient');
const config = require('../config/apiConfig');

class MandateAPI {
    constructor() {
        this.endpoints = config.endpoints.mandate;
    }

    async initiateMandateSetup(params) {
        return {
            success: true,
            data: {
                utilityReferenceId: 'MANDATE123',
                webUrl: 'https://mandate.example.com'
            }
        };
    }

    async getMandateStatus(utilityReferenceId) {
        return {
            success: true,
            data: {
                status: 'PENDING'
            }
        };
    }

    async registerMandate(opportunityId, params) {
        try {
            const response = await apiClient.post(`/opportunities/${opportunityId}/mandates`, {
                bankAccountVerificationId: params.bankAccountVerificationId,
                endDate: params.endDate,
                startDate: params.startDate,
                mandateType: params.mandateType,
                mandateAmount: params.mandateAmount,
                mandateFrequency: params.mandateFrequency,
                umrn: params.umrn,
                sourcingChannel: process.env.DSP_CHANNEL_CODE
            });

            logger.info('Mandate registered successfully', {
                opportunityId,
                utilityReferenceId: response.data.utilityReferenceId,
                status: response.data.status
            });

            return response.data;
        } catch (error) {
            logger.error('Error registering mandate', {
                error: error.message,
                opportunityId
            });
            throw error;
        }
    }

    validateMandateType(type) {
        const validTypes = ['API_MANDATE', 'PHYSICAL_MANDATE', 'UPI_MANDATE', 'ESIGN_MANDATE'];
        return validTypes.includes(type);
    }

    validateMandateFrequency(frequency) {
        const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'ADHOC'];
        return validFrequencies.includes(frequency);
    }

    validateEndDate(endDate) {
        const today = new Date();
        const end = new Date(endDate);
        const fiveYearsFromNow = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
        const fortyYearsFromNow = new Date(today.getFullYear() + 40, today.getMonth(), today.getDate());
        
        return end >= fiveYearsFromNow && end <= fortyYearsFromNow;
    }

    validateMandateAmount(amount) {
        const numAmount = parseFloat(amount);
        return numAmount > 0 && numAmount <= 10000000; // 1 crore limit
    }
}

module.exports = new MandateAPI();
