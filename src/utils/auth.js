const crypto = require('crypto');

/**
 * Generate timestamp in format yyyyMMddHHmmss
 * @returns {string} Formatted timestamp
 */
function generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate HMAC signature for API authentication
 * @param {string} method HTTP method
 * @param {string} timestamp Formatted timestamp
 * @param {object|null} body Request body for POST requests
 * @returns {string} Base64 encoded HMAC signature
 */
function generateSignature(method, timestamp, body = null) {
    const secretKey = process.env.DSP_SECRET_KEY;
    
    if (!secretKey) {
        throw new Error('DSP_SECRET_KEY must be configured in environment variables');
    }

    // Determine data for HMAC calculation based on HTTP method
    let data;
    if (method === 'GET') {
        data = timestamp;
    } else if (method === 'POST') {
        if (!body) {
            throw new Error('Request body is required for POST requests');
        }
        data = `${JSON.stringify(body)}.${timestamp}`;
    } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Create HMAC using SHA256 and encode in Base64
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(data);
    return hmac.digest('base64');
}

/**
 * Get authentication headers for API requests
 * @param {string} method HTTP method
 * @param {object|null} body Request body for POST requests
 * @returns {object} Headers object with authentication details
 */
async function getAuthHeaders(method, body = null) {
    const timestamp = generateTimestamp();
    const signature = generateSignature(method, timestamp, body);
    
    const channelCode = process.env.DSP_CHANNEL_CODE;
    if (!channelCode) {
        throw new Error('DSP_CHANNEL_CODE must be configured in environment variables');
    }

    return {
        'X-SourcingChannelCode': channelCode,
        'X-Signature': signature,
        'X-Timestamp': timestamp
    };
}

module.exports = {
    generateTimestamp,
    generateSignature,
    getAuthHeaders
}; 