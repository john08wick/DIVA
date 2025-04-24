require('dotenv').config({ path: '.env.test' });
const LoanAssistant = require('../assistant/LoanAssistant');

async function testLoanAssistantFunctions() {
    const loanAssistant = new LoanAssistant();
    await loanAssistant.initialize();

    const testCases = [
        {
            description: "Test mutual fund pledge initiation",
            input: "I want to pledge my mutual funds for 50000 rupees",
            expectedFunction: "initiate_mutual_fund_pledge"
        },
        {
            description: "Test OTP validation for pledge",
            input: "My OTP for mutual fund pledge is 123456",
            expectedFunction: "validate_mutual_fund_pledge_otp"
        },
        {
            description: "Test KYC initiation",
            input: "I want to complete my KYC verification",
            expectedFunction: "initiate_kyc"
        },
        {
            description: "Test bank account verification",
            input: "I want to verify my bank account. Account number is 1234567890 and IFSC is HDFC0001234",
            expectedFunction: "verify_bank_account"
        },
        {
            description: "Test mandate setup",
            input: "I want to setup mandate for loan repayment",
            expectedFunction: "setup_mandate"
        }
    ];

    console.log("\n🚀 Starting Loan Assistant Function Identification Tests\n");

    for (const testCase of testCases) {
        console.log(`\n📝 Test Case: ${testCase.description}`);
        console.log(`Input: "${testCase.input}"`);
        
        try {
            const response = await loanAssistant.handleMessage(testCase.input);
            
            // Log the OpenAI response and function identification
            console.log('\nOpenAI Response:', {
                identifiedFunction: response?.functionCall?.name || 'No function identified',
                message: response?.message,
                success: response?.success
            });

            // Check if the expected function was identified
            const functionIdentified = response?.functionCall?.name === testCase.expectedFunction;
            console.log('\nResult:', functionIdentified ? '✅ PASS' : '❌ FAIL');
            console.log('Expected Function:', testCase.expectedFunction);
            console.log('Actual Function:', response?.functionCall?.name || 'None');
            
            if (!functionIdentified) {
                console.log('\n⚠️ Function mismatch!');
            }

        } catch (error) {
            console.error('\n❌ Test Error:', {
                message: error.message,
                stack: error.stack
            });
        }

        console.log('\n' + '-'.repeat(80));
    }
}

// Run the tests
testLoanAssistantFunctions().catch(console.error); 