const OpenAI = require('openai');

class AnalyticsEngine {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.interactionStats = {
            totalInteractions: 0,
            successfulCompletions: 0,
            dropoffs: {},
            commonIssues: {},
            averageCompletionTime: 0,
            userFeedback: []
        };
    }

    async analyzeInteraction(conversation) {
        this.updateStats(conversation);
        const insights = await this.generateInsights(conversation);
        this.storeInsights(insights);
        return insights;
    }

    updateStats(conversation) {
        this.interactionStats.totalInteractions++;
        
        // Track completion status
        if (this.isApplicationCompleted(conversation)) {
            this.interactionStats.successfulCompletions++;
            this.updateCompletionTime(conversation);
        } else {
            this.trackDropoff(conversation);
        }

        // Track issues
        const issues = this.identifyIssues(conversation);
        this.updateIssueStats(issues);
    }

    isApplicationCompleted(conversation) {
        return conversation.applicationState.mandate_sent === true;
    }

    updateCompletionTime(conversation) {
        const completionTime = conversation.sessionDuration;
        const total = this.interactionStats.averageCompletionTime * (this.interactionStats.successfulCompletions - 1);
        this.interactionStats.averageCompletionTime = (total + completionTime) / this.interactionStats.successfulCompletions;
    }

    trackDropoff(conversation) {
        const lastStep = this.getLastCompletedStep(conversation);
        this.interactionStats.dropoffs[lastStep] = (this.interactionStats.dropoffs[lastStep] || 0) + 1;
    }

    getLastCompletedStep(conversation) {
        const steps = [
            'mandate_sent',
            'bank_verified',
            'aadhaar_processed',
            'otp_verified',
            'mutual_funds_checked',
            'pan_verified',
            'mobile_email_collected',
            'initial'
        ];

        for (let step of steps) {
            if (conversation.applicationState[step]) {
                return step;
            }
        }
        return 'initial';
    }

    identifyIssues(conversation) {
        const issues = [];
        const history = conversation.conversationHistory;

        // Check for repeated failures
        for (let key in conversation.failedAttempts) {
            if (conversation.failedAttempts[key] > 2) {
                issues.push({
                    type: 'repeated_failure',
                    step: key,
                    count: conversation.failedAttempts[key]
                });
            }
        }

        // Check for user frustration
        const frustrationCount = history.filter(msg => msg.sentiment === 'negative').length;
        if (frustrationCount > 2) {
            issues.push({
                type: 'user_frustration',
                count: frustrationCount
            });
        }

        // Check for long response times
        const longDelays = this.checkResponseDelays(history);
        if (longDelays.length > 0) {
            issues.push({
                type: 'response_delay',
                occurrences: longDelays
            });
        }

        return issues;
    }

    checkResponseDelays(history) {
        const delays = [];
        for (let i = 1; i < history.length; i++) {
            const timeDiff = history[i].timestamp - history[i-1].timestamp;
            if (timeDiff > 30000) { // 30 seconds
                delays.push({
                    messageIndex: i,
                    delay: timeDiff
                });
            }
        }
        return delays;
    }

    updateIssueStats(issues) {
        issues.forEach(issue => {
            const key = `${issue.type}_${issue.step || 'general'}`;
            this.interactionStats.commonIssues[key] = (this.interactionStats.commonIssues[key] || 0) + 1;
        });
    }

    async generateInsights(conversation) {
        const prompt = this.buildInsightPrompt(conversation);
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: prompt
            }],
            temperature: 0.3
        });

        return {
            suggestedImprovements: response.choices[0].message.content,
            statistics: {
                completionRate: this.calculateCompletionRate(),
                averageTime: this.interactionStats.averageCompletionTime,
                commonDropoffs: this.getTopDropoffs(),
                frequentIssues: this.getTopIssues()
            }
        };
    }

    buildInsightPrompt(conversation) {
        return `Analyze this loan application conversation and provide insights on:
1. User engagement patterns
2. Common friction points
3. Successful interaction patterns
4. Suggested improvements

Conversation context:
${JSON.stringify(conversation, null, 2)}`;
    }

    calculateCompletionRate() {
        return this.interactionStats.successfulCompletions / this.interactionStats.totalInteractions;
    }

    getTopDropoffs(limit = 3) {
        return Object.entries(this.interactionStats.dropoffs)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([step, count]) => ({ step, count }));
    }

    getTopIssues(limit = 3) {
        return Object.entries(this.interactionStats.commonIssues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([issue, count]) => ({ issue, count }));
    }

    storeInsights(insights) {
        // In a real implementation, store insights in a database
        console.log('New insights generated:', insights);
    }

    addUserFeedback(feedback) {
        this.interactionStats.userFeedback.push({
            ...feedback,
            timestamp: new Date()
        });
    }
}

module.exports = AnalyticsEngine; 