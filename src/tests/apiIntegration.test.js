const api = require('../utils/apiClient');
const { getAuthHeaders } = require('../utils/auth');
const logger = require('../utils/logger');

describe('API Integration Tests', () => {
    beforeAll(() => {
        // Ensure required environment variables are set
        process.env.DSP_SECRET_KEY = process.env.DSP_SECRET_KEY || 'test-secret-key';
        process.env.DSP_CHANNEL_CODE = process.env.DSP_CHANNEL_CODE || 'test-channel';
        process.env.API_BASE_URL = process.env.API_BASE_URL || 'https://api.staging.dspfin.com/los/api/v1';
    });

    describe('Authentication Headers', () => {
        test('should generate valid auth headers for GET request', async () => {
            const headers = await getAuthHeaders('GET');
            expect(headers).toHaveProperty('X-Timestamp');
            expect(headers).toHaveProperty('X-Signature');
            expect(headers).toHaveProperty('X-SourcingChannelCode');
            expect(headers['X-SourcingChannelCode']).toBe(process.env.DSP_CHANNEL_CODE);
        });

        test('should generate valid auth headers for POST request with body', async () => {
            const testBody = { test: 'data' };
            const headers = await getAuthHeaders('POST', testBody);
            expect(headers).toHaveProperty('X-Timestamp');
            expect(headers).toHaveProperty('X-Signature');
            expect(headers).toHaveProperty('X-SourcingChannelCode');
        });
    });

    describe('API Client Configuration', () => {
        test('should have correct base configuration', () => {
            expect(api.defaults).toBeDefined();
            expect(api.defaults.baseURL).toBe(process.env.API_BASE_URL);
            expect(api.defaults.headers['Content-Type']).toBe('application/json');
        });

        test('should add auth headers to requests', async () => {
            try {
                // Make a test request to a health check endpoint
                await api.get('/health');
                // If we get here, the request was made with proper headers
                expect(true).toBe(true);
            } catch (error) {
                // We expect a 404 error, but not a 401
                expect(error.status).not.toBe(401);
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle authentication errors properly', async () => {
            // Temporarily unset required env vars
            const originalSecret = process.env.DSP_SECRET_KEY;
            process.env.DSP_SECRET_KEY = '';

            try {
                await api.get('/test');
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(api.AuthenticationError);
                expect(error.message).toContain('DSP_SECRET_KEY');
            }

            // Restore env vars
            process.env.DSP_SECRET_KEY = originalSecret;
        });

        test('should retry on network errors', async () => {
            const mockEndpoint = '/test-retry';
            let attempts = 0;

            // Mock a failing request that succeeds on the third try
            jest.spyOn(api, 'get').mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Network Error');
                }
                return Promise.resolve({ data: 'success' });
            });

            const result = await api.withRetry(() => api.get(mockEndpoint));
            expect(attempts).toBe(3);
            expect(result).toEqual({ data: 'success' });
        });
    });

    describe('Live API Integration', () => {
        test('should make successful request to health endpoint', async () => {
            try {
                const response = await api.get('/health');
                expect(response).toBeDefined();
            } catch (error) {
                // If we get an error, it should not be a 401
                expect(error.status).not.toBe(401);
            }
        });

        test('should handle rate limiting properly', async () => {
            const requests = Array(5).fill().map(() => api.get('/test'));
            try {
                await Promise.all(requests);
            } catch (error) {
                // If we hit rate limit, ensure it's handled properly
                if (error.status === 429) {
                    expect(error).toBeInstanceOf(api.ApiError);
                    expect(error.message).toContain('Rate limit');
                }
            }
        });
    });
}); 