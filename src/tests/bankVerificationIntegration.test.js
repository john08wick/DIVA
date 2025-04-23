require('dotenv').config({ path: '.env.test' });
const bankVerificationApi = require('../api/bankVerificationApi');
const apiConfig = require('../config/apiConfig');

/**
 * Test bank verification integration
 */
async function testBankVerification() {
    console.log('\n=== Bank Verification Integration Test ===\n');

    // Test data
    const testData = {
        opportunityId: 'OPP8724213445',
        bankAccountNumber: '388108022658',
        ifscCode: 'ICIC0000009',
        bankName: 'ICICI Bank',
        bankAccountType: 'SAVINGS_ACCOUNT'
    };

    try {
        console.log('1. Testing environment configuration...');
        console.log('----------------------------------------');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('API Base URL:', apiConfig.getBaseUrl());
        console.log('DSP_SECRET_KEY:', process.env.DSP_SECRET_KEY ? 'Configured' : 'Missing');
        console.log('DSP_CHANNEL_CODE:', process.env.DSP_CHANNEL_CODE ? 'Configured' : 'Missing');
        console.log('----------------------------------------\n');

        // Test 1: Initiate Bank Verification
        console.log('2. Testing bank account verification initiation...');
        console.log('----------------------------------------');
        console.log('Request Data:', JSON.stringify(testData, null, 2));
        
        const initiationResponse = await bankVerificationApi.initiateBankVerification(testData);
        console.log('\nInitiation Response:', JSON.stringify(initiationResponse, null, 2));
        console.log('----------------------------------------\n');

        if (initiationResponse.utilityReferenceId) {
            // Test 2: Check Verification Status
            console.log('3. Testing verification status check...');
            console.log('----------------------------------------');
            console.log('Checking status for reference ID:', initiationResponse.utilityReferenceId);
            
            const statusResponse = await bankVerificationApi.getBankVerificationStatus(
                initiationResponse.utilityReferenceId
            );
            console.log('\nStatus Response:', JSON.stringify(statusResponse, null, 2));
            console.log('----------------------------------------\n');
        }

        // Test 3: Error Handling - Invalid IFSC
        console.log('4. Testing error handling - Invalid IFSC...');
        console.log('----------------------------------------');
        try {
            const invalidData = {
                ...testData,
                ifscCode: 'INVALID123'
            };
            console.log('Request Data:', JSON.stringify(invalidData, null, 2));
            
            await bankVerificationApi.initiateBankVerification(invalidData);
        } catch (error) {
            console.log('\nExpected error caught:', error.message);
        }
        console.log('----------------------------------------\n');

        // Test 4: Error Handling - Missing Required Fields
        console.log('5. Testing error handling - Missing Fields...');
        console.log('----------------------------------------');
        try {
            const incompleteData = {
                bankAccountNumber: '388108022658',
                ifscCode: 'ICIC0000009'
            };
            console.log('Request Data:', JSON.stringify(incompleteData, null, 2));
            
            await bankVerificationApi.initiateBankVerification(incompleteData);
        } catch (error) {
            console.log('\nExpected error caught:', error.message);
        }
        console.log('----------------------------------------\n');

        console.log('Integration test completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Status code:', error.response.status);
        }
        console.error('\nStack trace:', error.stack);
    }
}

// Run the test
testBankVerification().catch(console.error); 