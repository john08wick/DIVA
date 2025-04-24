const crypto = require('crypto');

function verifyAuth() {
    const secretKey = process.env.DSP_SECRET_KEY;
    const channelCode = process.env.DSP_CHANNEL_CODE;
    
    console.log('Verifying authentication configuration...');
    console.log('----------------------------------------');
    
    // Check if environment variables are set
    console.log('Environment Variables:');
    console.log(`DSP_SECRET_KEY: ${secretKey ? '✓ Set' : '✗ Missing'}`);
    console.log(`DSP_CHANNEL_CODE: ${channelCode ? '✓ Set' : '✗ Missing'}`);
    console.log(`Value: ${channelCode}`);
    
    // Verify secret key format
    if (secretKey) {
        try {
            const decodedKey = Buffer.from(secretKey, 'base64');
            console.log('\nSecret Key Validation:');
            console.log(`Length: ${decodedKey.length} bytes`);
            console.log(`Base64 Valid: ✓`);
        } catch (error) {
            console.log('\nSecret Key Validation:');
            console.log(`Base64 Valid: ✗ (${error.message})`);
        }
    }
    
    // Test signature generation
    const testTimestamp = '20250424095029';
    const testBody = { test: 'data' };
    
    try {
        const hmac = crypto.createHmac('sha256', secretKey);
        const data = `${JSON.stringify(testBody)}.${testTimestamp}`;
        hmac.update(data);
        const signature = hmac.digest('base64');
        
        console.log('\nSignature Generation Test:');
        console.log(`Input Data: ${data}`);
        console.log(`Generated Signature: ${signature}`);
    } catch (error) {
        console.log('\nSignature Generation Test:');
        console.log(`Failed: ${error.message}`);
    }
}

// Run the verification
verifyAuth(); 