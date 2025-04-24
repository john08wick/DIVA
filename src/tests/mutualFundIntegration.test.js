const LoanAssistant = require('../assistant/LoanAssistant');

async function testMutualFundIntegration() {
    console.log('Starting mutual fund integration test...\n');
    
    const assistant = new LoanAssistant();
    await assistant.initialize();

    try {
        // Step 1: Initial setup with mobile and PAN
        console.log('Step 1: Setting up initial context');
        let response = await assistant.handleMessage(
            "Hi, I want to take a loan against my mutual funds. My mobile is 9876543210 and PAN is ABCDE1234F"
        );
        console.log('Response:', response);

        // Step 2: Fetch mutual fund portfolio
        console.log('\nStep 2: Initiating mutual fund portfolio fetch');
        response = await assistant.handleMessage(
            "Please check my mutual fund portfolio"
        );
        console.log('Response:', response);

        // Step 3: Validate OTP for portfolio fetch
        console.log('\nStep 3: Validating OTP for portfolio fetch');
        response = await assistant.handleMessage(
            "I received the OTP. It is 123456"
        );
        console.log('Response:', response);

        // Step 4: View portfolio details
        console.log('\nStep 4: Getting portfolio details');
        response = await assistant.handleMessage(
            "Show me my mutual fund details"
        );
        console.log('Response:', response);

        // Step 5: Initiate pledge
        console.log('\nStep 5: Initiating mutual fund pledge');
        response = await assistant.handleMessage(
            "I want to pledge my mutual funds for the loan. My opportunity ID is OPP123456"
        );
        console.log('Response:', response);

        // Step 6: Validate OTP for pledge
        console.log('\nStep 6: Validating OTP for pledge');
        response = await assistant.handleMessage(
            "I got the OTP for pledge. It is 654321"
        );
        console.log('Response:', response);

        // Step 7: Check pledge status
        console.log('\nStep 7: Checking pledge status');
        response = await assistant.handleMessage(
            "What is the status of my mutual fund pledge?"
        );
        console.log('Response:', response);

        console.log('\nMutual fund integration test completed successfully!');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testMutualFundIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
}); 