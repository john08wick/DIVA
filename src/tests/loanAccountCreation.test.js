const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.test')
});
const LoanAccountHandler = require('../handlers/loanAccountHandler');

// Test data
const TEST_DATA = {
    opportunityId: 'OPP8724213445',
    bankAccountReferenceId: 'URBANK4674555244',
    agreementReferenceId: 'URAGR5525242915',
    kfsReferenceId: 'URKFS1311438232',
    mandateReferenceId: 'URMNDT1155573314',
    additionalDataReferenceId: 'URADDDATA4113361315',
    kycReferenceId: 'URKYC3689753934',
    photoVerificationReferenceId: 'URPHV1829553398',
    mobileVerificationLogReferenceId: 'URVERLOG5512951795',
    emailVerificationLogReferenceId: 'URVERLOG7444682546'
};

async function testLoanAccountCreation() {
    try {
        console.log('Starting Loan Account Creation test...');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('API Base URL:', process.env.API_BASE_URL);
        
        const loanAccountHandler = new LoanAccountHandler();

        // Test Case 1: Submit opportunity with all required data
        console.log('\n1. Testing opportunity submission with all required data...');
        const result = await loanAccountHandler.submitOpportunityForLoanCreation(TEST_DATA);
        console.log('Submission Result:', JSON.stringify(result, null, 2));

        // Test Case 2: Submit with missing verification logs
        console.log('\n2. Testing submission with missing verification logs...');
        const resultWithoutLogs = await loanAccountHandler.submitOpportunityForLoanCreation({
            ...TEST_DATA,
            mobileVerificationLogReferenceId: '',
            emailVerificationLogReferenceId: ''
        });
        console.log('Submission Without Logs Result:', JSON.stringify(resultWithoutLogs, null, 2));

        // Test Case 3: Submit with invalid reference ID format
        console.log('\n3. Testing submission with invalid reference ID format...');
        try {
            await loanAccountHandler.submitOpportunityForLoanCreation({
                ...TEST_DATA,
                bankAccountReferenceId: 'INVALID-FORMAT'
            });
        } catch (error) {
            console.log('Expected error for invalid format:', error.message);
        }

        // Test Case 4: Submit with missing required data
        console.log('\n4. Testing submission with missing required data...');
        try {
            await loanAccountHandler.submitOpportunityForLoanCreation({
                opportunityId: TEST_DATA.opportunityId
            });
        } catch (error) {
            console.log('Expected error for missing data:', error.message);
        }

        console.log('\nLoan Account Creation tests completed successfully');
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
testLoanAccountCreation(); 