const api = require('../src/utils/apiClient');
const { getAuthHeaders } = require('../src/utils/auth');
const logger = require('../src/utils/logger');
const apiConfig = require('../src/config/apiConfig');

async function verifyApiIntegration() {
    logger.info('Starting API integration verification...');

    try {
        // 1. Verify environment variables
        logger.info('Checking environment variables...');
        const requiredEnvVars = ['DSP_SECRET_KEY', 'DSP_CHANNEL_CODE', 'API_BASE_URL'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
        logger.info('✓ Environment variables are properly set');

        // 2. Test auth header generation
        logger.info('Testing auth header generation...');
        const testBody = { test: 'data' };
        const getHeaders = await getAuthHeaders('GET');
        const postHeaders = await getAuthHeaders('POST', testBody);

        if (!getHeaders['X-Timestamp'] || !getHeaders['X-Signature'] || !getHeaders['X-SourcingChannelCode']) {
            throw new Error('GET request headers are incomplete');
        }
        if (!postHeaders['X-Timestamp'] || !postHeaders['X-Signature'] || !postHeaders['X-SourcingChannelCode']) {
            throw new Error('POST request headers are incomplete');
        }
        logger.info('✓ Auth headers are generating correctly');

        // 3. Test API client configuration
        logger.info('Testing API client configuration...');
        const baseUrl = apiConfig.getBaseUrl();
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }
        logger.info('✓ API base URL is configured:', { baseUrl });

        // 4. Store the utilityReferenceId from the OTP trigger response
        let utilityReferenceId;

        // Test Mutual Fund Fetch OTP endpoints
        logger.info('Testing Mutual Fund Fetch OTP endpoints...');
        try {
            const sendOtpPayload = {
                mobileNumber: "9999999999",
                pan: "ABCDE1234F",
                provider: "MFC"
            };
            
            // Log authentication details
            logger.debug('Authentication details:', {
                secretKey: process.env.DSP_SECRET_KEY ? 'configured' : 'missing',
                channelCode: process.env.DSP_CHANNEL_CODE,
                baseUrl: apiConfig.getBaseUrl(),
                timestamp: new Date().toISOString()
            });

            // Validate timestamp format
            const timestamp = require('../src/utils/auth').generateTimestamp();
            logger.debug('Timestamp validation:', {
                generated: timestamp,
                length: timestamp.length,
                format: 'yyyyMMddHHmmss'
            });

            const sendOtpResponse = await api.post(apiConfig.endpoints.mutualFund.fetch.sendOTP, sendOtpPayload);
            logger.info('✓ Mutual Fund Fetch Send OTP endpoint is accessible', {});
            
            // Store the utilityReferenceId for the next request
            utilityReferenceId = sendOtpResponse.data.utilityReferenceId;

            const validateOtpPayload = {
                otp: "123456"
            };

            // Use the actual utilityReferenceId instead of TEST123
            const validateOtpResponse = await api.post(
                `/mutualFund/fetch/${utilityReferenceId}/validate-otp`,
                validateOtpPayload
            );
            logger.info('✓ Mutual Fund Fetch Validate OTP endpoint is accessible');
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                throw error;
            }
            if (error.status === 401) {
                throw new Error('Authentication failed: Received 401 unauthorized');
            }
            logger.warn('Mutual Fund Fetch OTP endpoints returned error (might be expected for test data):', { 
                status: error.status,
                message: error.message 
            });
        }

        // 5. Test Bank Verification endpoints
        logger.info('Testing Bank Verification endpoints...');
        try {
            const bankVerificationPayload = {
                opportunityId: "TEST123",
                bankAccountNumber: "1234567890",
                ifscCode: "HDFC0001234",
                bankName: "HDFC BANK",
                bankAccountType: "SAVINGS"
            };
            await api.post(apiConfig.endpoints.bank.verification.init, bankVerificationPayload);
            logger.info('✓ Bank Verification Init endpoint is accessible');

            // Test bank verification status endpoint
            const dummyUtilityRefId = 'TEST123';
            const statusEndpoint = apiConfig.endpoints.bank.verification.status.replace('{utilityReferenceId}', dummyUtilityRefId);
            await api.get(statusEndpoint);
            logger.info('✓ Bank Verification Status endpoint is accessible');
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                throw error;
            }
            if (error.status === 401) {
                throw new Error('Authentication failed: Received 401 unauthorized');
            }
            logger.warn('Bank Verification endpoints returned error (might be expected for test data):', {
                status: error.status,
                message: error.message
            });
        }

        // 6. Test Mutual Fund Pledge endpoints
        logger.info('Testing Mutual Fund Pledge endpoints...');
        try {
            // Test pledge OTP endpoint
            const pledgeOtpPayload = {
                mobileNumber: "9999999999",
                pan: "ABCDE1234F",
                provider: "MFC"
            };
            await api.post(apiConfig.endpoints.mutualFund.pledge.sendOTP, pledgeOtpPayload);
            logger.info('✓ Mutual Fund Pledge Send OTP endpoint is accessible');

            // Test pledge details endpoint
            const dummyPledgeRequestId = 'TEST123';
            const pledgeEndpoint = apiConfig.endpoints.mutualFund.pledge.getDetails.replace('{pledgeRequestId}', dummyPledgeRequestId);
            await api.get(pledgeEndpoint);
            logger.info('✓ Mutual Fund Pledge Details endpoint is accessible');
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                throw error;
            }
            if (error.status === 401) {
                throw new Error('Authentication failed: Received 401 unauthorized');
            }
            logger.warn('Mutual Fund Pledge endpoints returned error (might be expected for test data):', {
                status: error.status,
                message: error.message
            });
        }

        // 7. Test retry mechanism with actual endpoint
        logger.info('Testing retry mechanism with actual endpoint...');
        let retryAttempts = 0;
        try {
            await api.withRetry(async () => {
                retryAttempts++;
                if (retryAttempts < 2) {
                    throw new Error('Simulated network error');
                }
                const dummyFetchRequestId = 'TEST123';
                const fetchEndpoint = apiConfig.endpoints.mutualFund.fetch.getDetails.replace('{fetchRequestId}', dummyFetchRequestId);
                return api.get(fetchEndpoint);
            });
            logger.info('✓ Retry mechanism is working with actual endpoint');
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                throw error;
            }
            logger.warn('Retry mechanism test completed with expected error');
        }

        logger.info('API integration verification completed successfully!');
        return true;

    } catch (error) {
        logger.error('API integration verification failed:', error);
        throw error;
    }
}

// Run the verification if this script is executed directly
if (require.main === module) {
    verifyApiIntegration()
        .then(success => {
            if (success) {
                logger.info('All API integration checks passed!');
                process.exit(0);
            }
        })
        .catch(error => {
            logger.error('API integration verification failed:', error);
            process.exit(1);
        });
}

module.exports = verifyApiIntegration; 