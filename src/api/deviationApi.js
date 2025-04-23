const apiClient = require('../utils/apiClient');
const logger = require('../utils/logger');

class DeviationApi {
    constructor() {
        this.baseURL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    }

    async uploadDocumentForDeviation(params) {
        try {
            const response = await apiClient.post('/document', {
                opportunityId: params.opportunityId,
                base64DocumentFront: params.base64DocumentFront,
                base64DocumentBack: params.base64DocumentBack,
                utilityReferenceId: params.utilityReferenceId,
                mimeType: params.mimeType,
                documentType: params.documentType,
                provider: params.provider || 'SOURCING_CHANNEL'
            });

            logger.info('Document uploaded successfully for deviation', {
                opportunityId: params.opportunityId,
                utilityReferenceId: params.utilityReferenceId,
                documentType: params.documentType
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error uploading document for deviation', {
                error: errorMessage,
                details: errorDetails,
                opportunityId: params.opportunityId,
                utilityReferenceId: params.utilityReferenceId
            });
            
            throw new Error(`Failed to upload document: ${errorMessage}`);
        }
    }

    async submitDeviationReview(params) {
        try {
            const payload = {
                utilityReferenceId: params.utilityReferenceId,
                utilityType: params.utilityType,
                status: params.status || 'PENDING_CHECKER_APPROVAL',
                submittedDocuments: params.submittedDocuments,
                deviationReason: params.deviationReason,
                remarks: params.remarks
            };

            // Add deviation metadata if present
            if (params.deviationMetadata) {
                payload.deviationMetadata = params.deviationMetadata;
            }

            const response = await apiClient.post('/utility/review', payload);

            logger.info('Deviation review submitted successfully', {
                utilityReferenceId: params.utilityReferenceId,
                utilityType: params.utilityType,
                status: params.status,
                deviationReason: params.deviationReason
            });

            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || {};
            const errorMessage = errorDetails.fenixErrorCode || errorDetails.error || error.message;
            
            logger.error('Error submitting deviation review', {
                error: errorMessage,
                details: errorDetails,
                utilityReferenceId: params.utilityReferenceId
            });
            
            throw new Error(`Failed to submit deviation review: ${errorMessage}`);
        }
    }

    validateDocumentParams(params) {
        const requiredFields = [
            'opportunityId',
            'base64DocumentFront',
            'utilityReferenceId',
            'mimeType',
            'documentType'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate mimeType
        const validMimeTypes = [
            'TEXT_PLAIN',
            'TEXT_HTML',
            'IMAGE_JPEG',
            'IMAGE_PNG',
            'APPLICATION_JSON',
            'APPLICATION_XML',
            'APPLICATION_ZIP',
            'APPLICATION_PDF'
        ];
        if (!validMimeTypes.includes(params.mimeType)) {
            throw new Error(`Invalid mimeType. Must be one of: ${validMimeTypes.join(', ')}`);
        }

        // Validate documentType
        const validDocTypes = [
            'DRIVING_LICENSE',
            'ELECTION_CARD',
            'PASSPORT',
            'OTHER_DOCUMENT',
            'CANCELLED_CHEQUE',
            'PASSBOOK',
            'BANK_STATEMENT'
        ];
        if (!validDocTypes.includes(params.documentType)) {
            throw new Error(`Invalid documentType. Must be one of: ${validDocTypes.join(', ')}`);
        }

        return true;
    }

    validateReviewParams(params) {
        const requiredFields = [
            'utilityReferenceId',
            'utilityType',
            'submittedDocuments'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate utilityType
        const validUtilityTypes = ['PHOTO_VERIFICATION', 'BANK_VERIFICATION'];
        if (!validUtilityTypes.includes(params.utilityType)) {
            throw new Error(`Invalid utilityType. Must be one of: ${validUtilityTypes.join(', ')}`);
        }

        // Validate deviationReason if present
        if (params.deviationReason) {
            const validDeviationReasons = [
                'NAME_MISMATCH',
                'DOCUMENT_QUALITY',
                'DOCUMENT_EXPIRED',
                'INCORRECT_DOCUMENT',
                'OTHER'
            ];
            if (!validDeviationReasons.includes(params.deviationReason)) {
                throw new Error(`Invalid deviationReason. Must be one of: ${validDeviationReasons.join(', ')}`);
            }
        }

        // Validate deviationMetadata for name mismatch
        if (params.deviationReason === 'NAME_MISMATCH' && params.deviationMetadata) {
            const { nameInDocument, nameInRecord, mismatchType } = params.deviationMetadata;
            
            if (!nameInDocument || !nameInRecord) {
                throw new Error('Name mismatch deviation requires both nameInDocument and nameInRecord');
            }

            const validMismatchTypes = [
                'CASE_MISMATCH',
                'INITIAL_VS_FULL_NAME',
                'PARTIAL_NAME_MATCH',
                'SPELLING_VARIATION',
                'COMPLETE_MISMATCH'
            ];

            if (mismatchType && !validMismatchTypes.includes(mismatchType)) {
                throw new Error(`Invalid mismatchType. Must be one of: ${validMismatchTypes.join(', ')}`);
            }
        }

        return true;
    }
}

module.exports = DeviationApi; 