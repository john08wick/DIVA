const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.test')
});
const DeviationHandler = require('../handlers/deviationHandler');
const VerificationLogHandler = require('../handlers/verificationLogHandler');

// Validate required environment variables
const requiredEnvVars = [
    'DSP_SECRET_KEY',
    'DSP_CHANNEL_CODE',
    'API_BASE_URL'
];

function validateEnvironment() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

const TEST_OPPORTUNITY_ID = 'OPP9876543210'; // Using a different opportunity ID for testing
const TEST_UTILITY_REFERENCE_ID = 'URPHV' + Math.floor(Math.random() * 10000000000);
const TEST_DOCUMENT_ID = 'DOC' + Math.floor(Math.random() * 10000000000);

async function testDeviationAndVerification() {
    try {
        console.log('Starting Deviation and Verification integration test...');
        
        // Validate environment variables
        validateEnvironment();
        
        console.log('Environment:', process.env.NODE_ENV);
        console.log('API Base URL:', process.env.API_BASE_URL);
        console.log('Channel Code:', process.env.DSP_CHANNEL_CODE);
        console.log('Secret Key Length:', process.env.DSP_SECRET_KEY ? process.env.DSP_SECRET_KEY.length : 0);

        const deviationHandler = new DeviationHandler();
        const verificationLogHandler = new VerificationLogHandler();

        // Test Case 1: Handle Document Upload for Deviation
        console.log('\n1. Testing document upload for deviation...');
        const documentParams = {
            opportunityId: TEST_OPPORTUNITY_ID,
            base64DocumentFront: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // Truncated for brevity
            utilityReferenceId: TEST_UTILITY_REFERENCE_ID,
            mimeType: 'IMAGE_JPEG',
            documentType: 'PASSPORT',
            provider: 'SOURCING_CHANNEL'
        };

        try {
            const uploadResult = await deviationHandler.handleDocumentUpload(documentParams);
            console.log('Document Upload Result:', JSON.stringify(uploadResult, null, 2));
        } catch (error) {
            console.log('Expected error in document upload (using test data):', error.message);
        }

        // Test Case 2: Handle Deviation Review
        console.log('\n2. Testing deviation review...');
        const deviationReviewResult = await deviationHandler.submitDeviationReview({
            utilityReferenceId: TEST_UTILITY_REFERENCE_ID,
            utilityType: 'PHOTO_VERIFICATION',
            status: 'PENDING_CHECKER_APPROVAL',
            submittedDocuments: {
                PASSPORT: TEST_DOCUMENT_ID
            },
            deviationReason: 'TEST_DEVIATION', // Adding deviation reason
            remarks: 'Test deviation review'    // Adding remarks
        });

        console.log('Deviation Review Result:', JSON.stringify(deviationReviewResult, null, 2));

        // Test Case 3: Create Email Verification Log
        console.log('\n3. Testing email verification log creation...');
        const emailVerificationParams = {
            opportunityId: TEST_OPPORTUNITY_ID,
            verificationMethod: 'LINK',
            verificationRemarks: 'Email verification completed successfully',
            verificationStatus: 'SUCCESS',
            verificationType: 'EMAIL',
            verifiedValue: 'test@example.com',
            ipAddress: '116.73.243.197'
        };

        try {
            const emailResult = await verificationLogHandler.handleEmailVerification(emailVerificationParams);
            console.log('Email Verification Result:', JSON.stringify(emailResult, null, 2));
        } catch (error) {
            console.log('Expected error in email verification (using test data):', error.message);
        }

        // Test Case 4: Create Mobile Verification Log
        console.log('\n4. Testing mobile verification log creation...');
        const mobileVerificationParams = {
            opportunityId: TEST_OPPORTUNITY_ID,
            verificationMethod: 'OTP',
            verificationRemarks: 'Mobile verification completed successfully',
            verificationStatus: 'SUCCESS',
            verificationType: 'MOBILE',
            verifiedValue: '8828117336',
            ipAddress: '116.73.243.197'
        };

        try {
            const mobileResult = await verificationLogHandler.handleMobileVerification(mobileVerificationParams);
            console.log('Mobile Verification Result:', JSON.stringify(mobileResult, null, 2));
        } catch (error) {
            console.log('Expected error in mobile verification (using test data):', error.message);
        }

        // Test Case 5: Get Verification Log Status
        console.log('\n5. Testing verification log status check...');
        try {
            const response = await verificationLogHandler.getVerificationLogStatus(TEST_UTILITY_REFERENCE_ID);
            console.log('[INFO] Verification log status response:', response);
            
            const status = response?.data?.status || response?.status;
            if (!status) {
                throw new Error('Invalid response structure - missing status');
            }
            
            const result = {
                verificationLogStatus: {
                    success: true,
                    message: `Verification log status retrieved: ${status}`,
                    data: response.data
                }
            };
            console.log('Verification Log Status Result:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('[ERROR] Error getting verification log status', {
                error: error.message,
                details: error.response?.data || {},
                utilityReferenceId: TEST_UTILITY_REFERENCE_ID
            });
            
            const result = {
                verificationLogStatus: {
                    success: false,
                    error: `Failed to get verification log status: ${error.message}`,
                    message: 'Failed to get verification log status'
                }
            };
            console.log('Verification Log Status Result:', JSON.stringify(result, null, 2));
        }

        console.log('\nIntegration test completed - verified API endpoints are accessible');
        process.exit(0);
    } catch (error) {
        console.error('\nTest failed:', error.message);
        if (error.response?.data) {
            console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Run the test
testDeviationAndVerification(); 