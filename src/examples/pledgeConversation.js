const chatbot = require('../chatbot');

async function demonstratePledgeFlow() {
    try {
        console.log('Starting mutual fund pledge conversation...\n');

        // Initial request to pledge mutual funds
        const userMessage1 = "I want to pledge my mutual funds for a loan. I have DSP Nifty Next 50 Index Fund with folio number 8196783.";
        console.log('User:', userMessage1);
        let response = await chatbot.processMessage(userMessage1);
        console.log('Assistant:', response);

        // Send OTP request
        const userMessage2 = "Yes, please proceed with pledging. My mobile number is 9032390555 and opportunity ID is OPP8724213445.";
        console.log('\nUser:', userMessage2);
        response = await chatbot.processMessage(userMessage2);
        console.log('Assistant:', response);

        // Validate OTP
        const userMessage3 = "I received the OTP. It is 123456.";
        console.log('\nUser:', userMessage3);
        response = await chatbot.processMessage(userMessage3);
        console.log('Assistant:', response);

        // Check pledge status
        const userMessage4 = "Can you check the status of my pledge request?";
        console.log('\nUser:', userMessage4);
        response = await chatbot.processMessage(userMessage4);
        console.log('Assistant:', response);

    } catch (error) {
        console.error('Error in pledge conversation:', error);
    }
}

// Run the example
demonstratePledgeFlow(); 