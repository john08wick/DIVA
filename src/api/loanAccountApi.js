const apiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

class LoanAccountApi {
    constructor() {
        this.baseURL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    }

    /**
     * Submit opportunity to create loan account
     * @param {string} opportunityId - The opportunity ID
     * @param {Object} submittedDataList - List of reference IDs for various verifications
     * @returns {Promise<Object>} Response containing loan account details
     */
    async submitOpportunity(opportunityId, submittedDataList) {
        try {
            logger.info('Submitting opportunity for loan account creation', {
                opportunityId,
                submittedDataList
            });

            const endpoint = `/opportunity/${opportunityId}/submit`;
            const response = await apiClient.post(endpoint, {
                submittedDataList
            });

            logger.info('Successfully submitted opportunity', {
                opportunityId,
                fenixLoanAccountId: response.fenixLoanAccountId,
                fenixClientId: response.fenixClientId,
                status: response.status
            });

            return {
                success: true,
                data: response
            };

        } catch (error) {
            logger.error('Failed to submit opportunity', error, {
                opportunityId,
                submittedDataList
            });

            // Handle specific error cases
            if (error.response?.data?.fenixErrorCode) {
                const errorCode = error.response.data.fenixErrorCode;
                switch (errorCode) {
                    case 'INVALID_STATUS_FOR_SUBMIT_OPPORTUNITY':
                        throw new Error('Opportunity is not in the correct status for submission');
                    case 'NO_RECORDS_FOUND_FOR_UTILTIY_REFERENCE_ID':
                        throw new Error('One or more reference IDs are invalid');
                    case 'MISSING_REQUIRED_DATA_FOR_SUBMIT_OPPORTUNITY':
                        throw new Error('Required data is missing for opportunity submission');
                    case 'BAD_REQUEST_INVALID_INPUT':
                        throw new Error('One or more submitted data items are invalid or not approved');
                    default:
                        throw new Error(`Submission failed: ${error.response.data.message || errorCode}`);
                }
            }

            throw error;
        }
    }

    /**
     * Validate submitted data list before submission
     * @param {Array} submittedDataList - List of data items to validate
     * @throws {Error} If validation fails
     */
    validateSubmittedData(submittedDataList) {
        const requiredTypes = [
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

        // Check if all required types are present
        const submittedTypes = submittedDataList.map(item => item.dataType);
        const missingTypes = requiredTypes.filter(type => !submittedTypes.includes(type));

        if (missingTypes.length > 0) {
            throw new Error(`Missing required data types: ${missingTypes.join(', ')}`);
        }

        // Check if all items have reference IDs
        const missingRefs = submittedDataList.filter(item => !item.referenceId);
        if (missingRefs.length > 0) {
            throw new Error(`Missing reference IDs for: ${missingRefs.map(item => item.dataType).join(', ')}`);
        }
    }

    /**
     * Format submitted data list for API request
     * @param {Object} data - Object containing all reference IDs
     * @returns {Array} Formatted submitted data list
     */
    formatSubmittedDataList(data) {
        return [
            {
                dataType: 'BANK_ACCOUNT',
                referenceId: data.bankAccountReferenceId
            },
            {
                dataType: 'AGREEMENT',
                referenceId: data.agreementReferenceId
            },
            {
                dataType: 'KFS',
                referenceId: data.kfsReferenceId
            },
            {
                dataType: 'MANDATE',
                referenceId: data.mandateReferenceId
            },
            {
                dataType: 'ADDITIONAL_DATA',
                referenceId: data.additionalDataReferenceId
            },
            {
                dataType: 'KYC',
                referenceId: data.kycReferenceId
            },
            {
                dataType: 'PHOTO_VERIFICATION',
                referenceId: data.photoVerificationReferenceId
            },
            {
                dataType: 'MOBILE_VERIFICATION_LOG',
                referenceId: data.mobileVerificationReferenceId
            },
            {
                dataType: 'EMAIL_VERIFICATION_LOG',
                referenceId: data.emailVerificationReferenceId
            }
        ];
    }
}

module.exports = LoanAccountApi; 