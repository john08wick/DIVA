const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.test')
});
const MandateHandler = require('../handlers/mandateHandler');

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

async function testMandateSetup() {
    try {
        console.log('Starting mandate setup integration test...');
        
        // Validate environment variables
        validateEnvironment();
        
        console.log('Environment:', process.env.NODE_ENV);
        console.log('API Base URL:', process.env.API_BASE_URL);
        console.log('Channel Code:', process.env.DSP_CHANNEL_CODE);
        console.log('Secret Key Length:', process.env.DSP_SECRET_KEY ? process.env.DSP_SECRET_KEY.length : 0);

        const mandateHandler = new MandateHandler();

        // Test Case 1: Initiate Mandate Setup
        console.log('\n1. Testing mandate setup initiation...');
        const setupParams = {
            opportunityId: 'OPP8724213445',
            bankAccountVerificationId: 'URBANK4674555244',
            endDate: '2039-09-20',
            mandateType: 'API_MANDATE',
            mandateAmount: '50',
            redirectionUrl: 'https://www.voltmoney.in'
        };

        const setupResult = await mandateHandler.initiateMandateSetup(setupParams);
        console.log('Mandate Setup Result:', JSON.stringify(setupResult, null, 2));

        if (!setupResult.success) {
            throw new Error(`Mandate setup failed: ${setupResult.message}`);
        }

        const utilityReferenceId = setupResult.data.utilityReferenceId;
        console.log('Utility Reference ID:', utilityReferenceId);

        // Test Case 2: Get Mandate Status
        console.log('\n2. Testing mandate status check...');
        const statusResult = await mandateHandler.getMandateStatus(utilityReferenceId);
        console.log('Mandate Status Result:', JSON.stringify(statusResult, null, 2));

        if (!statusResult.success) {
            throw new Error(`Mandate status check failed: ${statusResult.message}`);
        }

        console.log('\nTest completed successfully!');
    } catch (error) {
        console.error('\nTest failed:', error.message);
        if (error.response?.data) {
            console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Run the test
testMandateSetup(); 