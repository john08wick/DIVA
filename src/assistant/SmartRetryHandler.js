const OpenAI = require('openai');

class SmartRetryHandler {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Configure retry strategies for different types of operations
        this.retryConfigs = {
            verification: {
                maxAttempts: 3,
                backoffFactor: 1.5,
                initialDelay: 1000, // 1 second
                jitter: 0.2 // 20% random jitter
            },
            upload: {
                maxAttempts: 2,
                backoffFactor: 2,
                initialDelay: 2000,
                jitter: 0.1
            },
            api: {
                maxAttempts: 4,
                backoffFactor: 1.2,
                initialDelay: 500,
                jitter: 0.15
            }
        };

        // Track retry history for analytics
        this.retryHistory = [];
    }

    /**
     * Smart retry mechanism with exponential backoff and jitter
     * @param {Function} operation - The async operation to retry
     * @param {string} type - Type of operation (verification/upload/api)
     * @param {Object} context - Current conversation context
     */
    async retryWithBackoff(operation, type, context) {
        const config = this.retryConfigs[type];
        let attempt = 1;
        let delay = config.initialDelay;

        while (attempt <= config.maxAttempts) {
            try {
                const result = await operation();
                
                // If successful, analyze and store the recovery pattern
                if (attempt > 1) {
                    await this.analyzeRecoveryPattern(type, attempt, context);
                }
                
                return result;
            } catch (error) {
                if (attempt === config.maxAttempts) {
                    throw error;
                }

                // Calculate next delay with jitter
                const jitterAmount = delay * config.jitter;
                const actualDelay = delay + (Math.random() * jitterAmount * 2) - jitterAmount;
                
                // Log retry attempt
                this.logRetryAttempt(type, attempt, error, actualDelay);
                
                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, actualDelay));
                
                // Increase delay for next attempt
                delay *= config.backoffFactor;
                attempt++;
            }
        }
    }

    /**
     * Analyze recovery patterns to improve retry strategies
     */
    async analyzeRecoveryPattern(type, attempts, context) {
        const analysis = {
            type,
            attempts,
            timestamp: new Date(),
            context: {
                userSentiment: context.userSentiment,
                currentStep: context.applicationState.currentStep
            }
        };

        // Use GPT-4 to analyze the recovery pattern
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `Analyze this retry recovery pattern and suggest improvements:
                ${JSON.stringify(analysis, null, 2)}`
            }],
            temperature: 0.3
        });

        // Store analysis for future improvements
        this.retryHistory.push({
            ...analysis,
            suggestions: response.choices[0].message.content
        });
    }

    /**
     * Determine if an error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ETIMEDOUT',
            'ECONNRESET',
            'ECONNREFUSED',
            'NETWORK_ERROR',
            'RATE_LIMIT_EXCEEDED',
            'TEMPORARY_ERROR'
        ];

        return retryableErrors.some(code => 
            error.code === code || 
            error.message.includes(code) ||
            (error.response && error.response.status >= 500)
        );
    }

    /**
     * Log retry attempts for monitoring and analytics
     */
    logRetryAttempt(type, attempt, error, delay) {
        const logEntry = {
            timestamp: new Date(),
            type,
            attempt,
            error: {
                message: error.message,
                code: error.code,
                status: error.response?.status
            },
            delay,
            success: false
        };

        this.retryHistory.push(logEntry);
        console.log(`Retry attempt ${attempt} for ${type}:`, logEntry);
    }

    /**
     * Get retry statistics for analytics
     */
    getRetryStats() {
        const stats = {
            totalRetries: this.retryHistory.length,
            byType: {},
            successRate: {},
            averageAttempts: {}
        };

        // Calculate statistics by type
        this.retryHistory.forEach(entry => {
            const type = entry.type;
            if (!stats.byType[type]) {
                stats.byType[type] = {
                    total: 0,
                    successful: 0,
                    attempts: []
                };
            }

            stats.byType[type].total++;
            if (entry.success) {
                stats.byType[type].successful++;
            }
            if (entry.attempts) {
                stats.byType[type].attempts.push(entry.attempts);
            }
        });

        // Calculate success rates and average attempts
        Object.keys(stats.byType).forEach(type => {
            const typeStats = stats.byType[type];
            stats.successRate[type] = typeStats.successful / typeStats.total;
            stats.averageAttempts[type] = 
                typeStats.attempts.reduce((a, b) => a + b, 0) / typeStats.attempts.length;
        });

        return stats;
    }

    /**
     * Update retry configuration based on success patterns
     */
    updateRetryConfig() {
        const stats = this.getRetryStats();
        
        Object.keys(this.retryConfigs).forEach(type => {
            const typeStats = stats.averageAttempts[type];
            if (typeStats) {
                // Adjust max attempts based on average successful attempts
                this.retryConfigs[type].maxAttempts = 
                    Math.ceil(typeStats * 1.5); // Add 50% buffer
                
                // Adjust backoff factor based on success rate
                if (stats.successRate[type] < 0.5) {
                    this.retryConfigs[type].backoffFactor *= 1.2; // Increase backoff
                } else if (stats.successRate[type] > 0.8) {
                    this.retryConfigs[type].backoffFactor *= 0.9; // Decrease backoff
                }
            }
        });
    }
}

module.exports = SmartRetryHandler; 