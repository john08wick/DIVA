const apiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

class LoanAccountApi {
    constructor() {
        this.baseURL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    }

    async submitOpportunity(opportunityId, submittedDataList) {
        try {
            const response = await apiClient.post(
                `/opportunity/${opportunityId}/submit`,
                { submittedDataList }
            );

            logger.info('Opportunity submitted successfully', {
                opportunityId,
                fenixLoanAccountId: response.data.fenixLoanAccountId,
                fenixClientId: response.data.fenixClientId,
                status: response.data.status
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error submitting opportunity', {
                error: errorMessage,
                details: errorDetails,
                opportunityId
            });
            
            throw new Error(`Failed to submit opportunity: ${errorMessage}`);
        }
    }

    validateSubmittedDataList(submittedDataList) {
        const requiredDataTypes = [
            'BANK_ACCOUNT',
            'AGREEMENT',
            'KFS',
            'MANDATE',
            'ADDITIONAL_DATA',
            'KYC',
            'PHOTO_VERIFICATION',
            'MOBILE_VERIFICATION_LOG',
            'EMAIL_VERIFICATION_LOG'
        ];

        // Check if all required data types are present
        const missingDataTypes = requiredDataTypes.filter(dataType => 
            !submittedDataList.some(data => data.dataType === dataType)
        );

        if (missingDataTypes.length > 0) {
            throw new Error(`Missing required data types: ${missingDataTypes.join(', ')}`);
        }

        // Validate reference IDs
        const invalidDataTypes = submittedDataList.filter(data => {
            // All data types except verification logs must have a reference ID
            if (!['MOBILE_VERIFICATION_LOG', 'EMAIL_VERIFICATION_LOG'].includes(data.dataType)) {
                return !data.referenceId;
            }
            return false;
        });

        if (invalidDataTypes.length > 0) {
            const types = invalidDataTypes.map(data => data.dataType).join(', ');
            throw new Error(`Missing reference IDs for data types: ${types}`);
        }

        // Validate reference ID formats
        const referenceIdFormats = {
            'BANK_ACCOUNT': /^URBANK\d{10}$/,
            'AGREEMENT': /^URAGR\d{10}$/,
            'MANDATE': /^URMNDT\d{10}$/,
            'KYC': /^URKYC\d{10}$/,
            'PHOTO_VERIFICATION': /^URPHV\d{10}$/,
            'ADDITIONAL_DATA': /^URADDDATA\d{10}$/,
            'KFS': /^URKFS\d{10}$/
        };

        const invalidFormatTypes = submittedDataList.filter(data => {
            const format = referenceIdFormats[data.dataType];
            if (format && data.referenceId) {
                return !format.test(data.referenceId);
            }
            return false;
        });

        if (invalidFormatTypes.length > 0) {
            const types = invalidFormatTypes.map(data => 
                `${data.dataType} (${data.referenceId})`
            ).join(', ');
            throw new Error(`Invalid reference ID format for: ${types}`);
        }

        return true;
    }
}

module.exports = LoanAccountApi; 