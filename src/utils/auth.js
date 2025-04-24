const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generate timestamp in yyyyMMddHHmmss format
 * @returns {string} Formatted timestamp
 */
function generateTimestamp() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
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
    } else if (method === 'POST' || method === 'PUT') {
        if (!body) {
            throw new Error('Request body is required for POST/PUT requests');
        }
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        data = `${bodyStr}.${timestamp}`;
    } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Create HMAC using SHA256 and encode in Base64
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(data);
    const signature = hmac.digest('base64');

    logger.debug('Generated signature:', {
        method,
        timestamp,
        bodyLength: body ? JSON.stringify(body).length : 0,
        signature,
        data
    });

    return signature;
}

/**
 * Get authentication headers for API requests
 * @param {string} method HTTP method
 * @param {object|null} body Request body for POST requests
 * @returns {object} Headers object with authentication details
 */
function getAuthHeaders(method, body = null) {
    const timestamp = generateTimestamp();
    const signature = generateSignature(method, timestamp, body);
    const channelCode = process.env.DSP_CHANNEL_CODE;

    if (!channelCode) {
        throw new Error('DSP_CHANNEL_CODE must be configured in environment variables');
    }

    const headers = {
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'X-SourcingChannelCode': channelCode
    };

    logger.debug('Generated auth headers:', {
        method,
        timestamp,
        channelCode,
        signature,
        bodyLength: body ? JSON.stringify(body).length : 0
    });

    return headers;
}

module.exports = {
    generateTimestamp,
    generateSignature,
    getAuthHeaders
}; 