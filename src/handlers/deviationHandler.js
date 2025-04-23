const DeviationApi = require('../api/deviationApi');
const logger = require('../utils/logger');

class DeviationHandler {
    constructor() {
        this.deviationApi = new DeviationApi();
    }

    async handleDocumentUpload(params) {
        try {
            // Validate parameters
            this.deviationApi.validateDocumentParams(params);

            // Upload document
            const result = await this.deviationApi.uploadDocumentForDeviation(params);

            return {
                success: true,
                data: result,
                message: 'Document uploaded successfully for deviation'
            };
        } catch (error) {
            logger.error('Failed to upload document for deviation', {
                error: error.message,
                opportunityId: params.opportunityId,
                utilityReferenceId: params.utilityReferenceId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to upload document for deviation'
            };
        }
    }

    async handleDeviationReview(params) {
        try {
            // Validate parameters
            this.deviationApi.validateReviewParams(params);

            // Submit review
            const result = await this.deviationApi.submitDeviationReview(params);

            return {
                success: true,
                data: result,
                message: 'Deviation review submitted successfully'
            };
        } catch (error) {
            logger.error('Failed to submit deviation review', {
                error: error.message,
                utilityReferenceId: params.utilityReferenceId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to submit deviation review'
            };
        }
    }

    async handleDeviationFlow(params) {
        try {
            // First upload the document
            const uploadResult = await this.handleDocumentUpload(params);
            if (!uploadResult.success) {
                return uploadResult;
            }

            // Then submit for review
            const reviewParams = {
                utilityReferenceId: params.utilityReferenceId,
                utilityType: params.utilityType || this.determineUtilityType(params.documentType),
                submittedDocuments: {
                    [params.documentType]: uploadResult.data.documentId
                }
            };

            const reviewResult = await this.handleDeviationReview(reviewParams);
            
            return {
                success: true,
                data: {
                    upload: uploadResult.data,
                    review: reviewResult.data
                },
                message: 'Deviation flow completed successfully'
            };
        } catch (error) {
            logger.error('Failed to handle deviation flow', {
                error: error.message,
                opportunityId: params.opportunityId,
                utilityReferenceId: params.utilityReferenceId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to handle deviation flow'
            };
        }
    }

    determineUtilityType(documentType) {
        const bankDocuments = ['CANCELLED_CHEQUE', 'PASSBOOK', 'BANK_STATEMENT'];
        const photoDocuments = ['DRIVING_LICENSE', 'ELECTION_CARD', 'PASSPORT'];

        if (bankDocuments.includes(documentType)) {
            return 'BANK_VERIFICATION';
        } else if (photoDocuments.includes(documentType)) {
            return 'PHOTO_VERIFICATION';
        }

        throw new Error(`Cannot determine utility type for document type: ${documentType}`);
    }

    async handleNameMismatchDeviation(params) {
        try {
            const {
                opportunityId,
                utilityReferenceId,
                documentType,
                nameInDocument,
                nameInRecord,
                base64DocumentFront,
                deviationReason,
                remarks
            } = params;

            // First upload the supporting document
            const uploadResult = await this.handleDocumentUpload({
                opportunityId,
                utilityReferenceId,
                documentType,
                base64DocumentFront,
                mimeType: 'IMAGE_JPEG'
            });

            if (!uploadResult.success) {
                return uploadResult;
            }

            // Submit for name mismatch deviation review
            const reviewParams = {
                utilityReferenceId,
                utilityType: this.determineUtilityType(documentType),
                status: 'PENDING_CHECKER_APPROVAL',
                submittedDocuments: {
                    [documentType]: uploadResult.data.documentId
                },
                deviationReason: deviationReason || 'NAME_MISMATCH',
                remarks: remarks || `Name mismatch between document (${nameInDocument}) and record (${nameInRecord})`,
                deviationMetadata: {
                    nameInDocument,
                    nameInRecord,
                    mismatchType: this.determineNameMismatchType(nameInDocument, nameInRecord)
                }
            };

            const reviewResult = await this.handleDeviationReview(reviewParams);
            
            return {
                success: true,
                data: {
                    upload: uploadResult.data,
                    review: reviewResult.data
                },
                message: 'Name mismatch deviation submitted successfully'
            };
        } catch (error) {
            logger.error('Failed to handle name mismatch deviation', {
                error: error.message,
                opportunityId: params.opportunityId,
                utilityReferenceId: params.utilityReferenceId
            });

            return {
                success: false,
                error: error.message,
                message: 'Failed to handle name mismatch deviation'
            };
        }
    }

    determineNameMismatchType(nameInDocument, nameInRecord) {
        // Convert both names to lowercase for comparison
        const docName = nameInDocument.toLowerCase().trim();
        const recordName = nameInRecord.toLowerCase().trim();

        if (docName === recordName) {
            return 'CASE_MISMATCH';
        }

        // Split names into parts
        const docParts = docName.split(' ').filter(part => part.length > 0);
        const recordParts = recordName.split(' ').filter(part => part.length > 0);

        // Check for initial vs full name
        if (docParts.some(part => part.length === 1) || recordParts.some(part => part.length === 1)) {
            return 'INITIAL_VS_FULL_NAME';
        }

        // Check if all parts of one name are contained in the other
        const allPartsContained = docParts.every(part => 
            recordParts.some(rPart => rPart.includes(part) || part.includes(rPart))
        );

        if (allPartsContained) {
            return 'PARTIAL_NAME_MATCH';
        }

        // Calculate similarity score
        const similarity = this.calculateNameSimilarity(docName, recordName);
        if (similarity >= 0.8) {
            return 'SPELLING_VARIATION';
        }

        return 'COMPLETE_MISMATCH';
    }

    calculateNameSimilarity(str1, str2) {
        if (str1.length === 0 || str2.length === 0) return 0;
        if (str1 === str2) return 1;
        
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len1][len2]) / maxLen;
    }

    validateNameMismatchParams(params) {
        const requiredFields = [
            'opportunityId',
            'utilityReferenceId',
            'documentType',
            'nameInDocument',
            'nameInRecord',
            'base64DocumentFront'
        ];

        const missingFields = requiredFields.filter(field => !params[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields for name mismatch deviation: ${missingFields.join(', ')}`);
        }

        // Validate document type
        const validDocTypes = [
            'DRIVING_LICENSE',
            'ELECTION_CARD',
            'PASSPORT',
            'BANK_STATEMENT',
            'CANCELLED_CHEQUE',
            'PASSBOOK'
        ];

        if (!validDocTypes.includes(params.documentType)) {
            throw new Error(`Invalid documentType for name mismatch. Must be one of: ${validDocTypes.join(', ')}`);
        }

        return true;
    }
}

module.exports = DeviationHandler; 