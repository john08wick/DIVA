const LoanAccountApi = require('../api/loanAccountApi');
const logger = require('../utils/logger');

class LoanAccountHandler {
    constructor() {
        this.loanAccountApi = new LoanAccountApi();
    }

    async submitOpportunityForLoanCreation(params) {
        try {
            const {
                opportunityId,
                bankAccountReferenceId,
                agreementReferenceId,
                kfsReferenceId,
                mandateReferenceId,
                additionalDataReferenceId,
                kycReferenceId,
                photoVerificationReferenceId,
                mobileVerificationLogReferenceId,
                emailVerificationLogReferenceId
            } = params;

            // Construct the submitted data list
            const submittedDataList = [
                {
                    dataType: 'BANK_ACCOUNT',
                    referenceId: bankAccountReferenceId
                },
                {
                    dataType: 'AGREEMENT',
                    referenceId: agreementReferenceId
                },
                {
                    dataType: 'KFS',
                    referenceId: kfsReferenceId
                },
                {
                    dataType: 'MANDATE',
                    referenceId: mandateReferenceId
                },
                {
                    dataType: 'ADDITIONAL_DATA',
                    referenceId: additionalDataReferenceId
                },
                {
                    dataType: 'KYC',
                    referenceId: kycReferenceId
                },
                {
                    dataType: 'PHOTO_VERIFICATION',
                    referenceId: photoVerificationReferenceId
                },
                {
                    dataType: 'MOBILE_VERIFICATION_LOG',
                    referenceId: mobileVerificationLogReferenceId || ''
                },
                {
                    dataType: 'EMAIL_VERIFICATION_LOG',
                    referenceId: emailVerificationLogReferenceId || ''
                }
            ];

            // Validate the submitted data list
            this.loanAccountApi.validateSubmittedDataList(submittedDataList);

            // Submit the opportunity
            const result = await this.loanAccountApi.submitOpportunity(opportunityId, submittedDataList);

            // Check if all required data is in ACCEPTED status
            const hasInvalidData = result.requiredData.some(data => data.status !== 'ACCEPTED');
            if (hasInvalidData) {
                const invalidItems = result.requiredData
                    .filter(data => data.status !== 'ACCEPTED')
                    .map(data => `${data.dataType} (${data.status}${data.subStatus ? ': ' + data.subStatus : ''})`)
                    .join(', ');

                throw new Error(`Some required data is not in ACCEPTED status: ${invalidItems}`);
            }

            return {
                success: true,
                data: {
                    opportunityId: result.opportunityId,
                    status: result.status,
                    fenixLoanAccountId: result.fenixLoanAccountId,
                    fenixClientId: result.fenixClientId,
                    requiredData: result.requiredData
                },
                message: 'Loan account created successfully'
            };
        } catch (error) {
            logger.error('Failed to submit opportunity for loan creation', {
                error: error.message,
                opportunityId: params.opportunityId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to create loan account'
            };
        }
    }

    validateParams(params) {
        const requiredFields = [
            'opportunityId',
            'bankAccountReferenceId',
            'agreementReferenceId',
            'kfsReferenceId',
            'mandateReferenceId',
            'additionalDataReferenceId',
            'kycReferenceId',
            'photoVerificationReferenceId'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate opportunity ID format
        if (!/^OPP\d{10}$/.test(params.opportunityId)) {
            throw new Error('Invalid opportunity ID format');
        }

        return true;
    }
}

module.exports = LoanAccountHandler; 