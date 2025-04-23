const OpenAI = require('openai');

class PredictiveEngine {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async predictNextStep(conversationContext) {
        const { applicationState, conversationHistory } = conversationContext;
        
        // Analyze current application state
        const currentStep = this.getCurrentStep(applicationState);
        const commonIssues = this.getCommonIssues(currentStep);
        const userBehavior = this.analyzeUserBehavior(conversationHistory);

        return {
            suggestedActions: this.getSuggestedActions(currentStep),
            potentialIssues: commonIssues,
            helpfulResources: this.getRelevantResources(currentStep),
            timeEstimate: this.estimateTimeToComplete(currentStep)
        };
    }

    getCurrentStep(applicationState) {
        const steps = [
            'initial',
            'mobile_email_collected',
            'pan_verified',
            'mutual_funds_checked',
            'otp_verified',
            'aadhaar_processed',
            'bank_verified',
            'mandate_sent'
        ];

        for (let step of steps) {
            if (!applicationState[step]) {
                return step;
            }
        }
        return 'completed';
    }

    getCommonIssues(step) {
        const issueMap = {
            'pan_verified': [
                'PAN card image not clear',
                'PAN details mismatch',
                'Verification timeout'
            ],
            'aadhaar_processed': [
                'Document resolution too low',
                'Missing pages',
                'Information not readable'
            ],
            'bank_verified': [
                'Invalid IFSC code',
                'Account holder name mismatch',
                'Account inactive'
            ]
        };
        return issueMap[step] || [];
    }

    analyzeUserBehavior(history) {
        if (!Array.isArray(history)) {
            return {
                hesitation: false,
                confusion: false,
                urgency: false,
                complexity: false
            };
        }

        const recentMessages = history.slice(-5);
        return {
            hesitation: this.detectHesitation(recentMessages[recentMessages.length - 1]),
            confusion: this.detectConfusion(recentMessages[recentMessages.length - 1]),
            urgency: this.detectUrgency(recentMessages[recentMessages.length - 1]),
            complexity: this.detectComplexity(recentMessages[recentMessages.length - 1])
        };
    }

    getMessageContent(msg) {
        if (!msg || !msg.content) return '';
        
        if (typeof msg.content === 'object') {
            if (msg.content.message && typeof msg.content.message === 'string') {
                return msg.content.message;
            }
            return '';
        }
        
        return String(msg.content);
    }

    detectHesitation(message) {
        try {
            const content = this.getMessageContent(message);
            if (!content) return false;
            
            const hesitationWords = ['maybe', 'perhaps', 'not sure', 'might', 'possibly'];
            return hesitationWords.some(word => content.toLowerCase().includes(word));
        } catch (error) {
            console.error('Error in detectHesitation:', error);
            return false;
        }
    }

    detectConfusion(message) {
        try {
            const content = this.getMessageContent(message);
            if (!content) return false;
            
            const confusionWords = ['confused', 'don\'t understand', 'what does', 'how do', 'unclear'];
            return confusionWords.some(word => content.toLowerCase().includes(word));
        } catch (error) {
            console.error('Error in detectConfusion:', error);
            return false;
        }
    }

    detectUrgency(message) {
        try {
            const content = this.getMessageContent(message);
            if (!content) return false;
            
            const urgencyWords = ['urgent', 'asap', 'immediately', 'quickly', 'emergency'];
            return urgencyWords.some(word => content.toLowerCase().includes(word));
        } catch (error) {
            console.error('Error in detectUrgency:', error);
            return false;
        }
    }

    detectComplexity(message) {
        try {
            const content = this.getMessageContent(message);
            if (!content) return 'medium';
            
            const complexWords = ['complex', 'complicated', 'difficult', 'advanced'];
            const simpleWords = ['simple', 'basic', 'easy', 'straightforward'];
            
            if (complexWords.some(word => content.toLowerCase().includes(word))) {
                return 'high';
            }
            if (simpleWords.some(word => content.toLowerCase().includes(word))) {
                return 'low';
            }
            return 'medium';
        } catch (error) {
            console.error('Error in detectComplexity:', error);
            return 'medium';
        }
    }

    getSuggestedActions(step) {
        const actionMap = {
            'initial': [
                'Have your mobile phone ready for OTP',
                'Keep your email accessible'
            ],
            'pan_verified': [
                'Keep your mutual fund statements handy',
                'Ensure you have your latest PAN card'
            ],
            'aadhaar_processed': [
                'Prepare your bank account details',
                'Have your checkbook ready for IFSC code'
            ]
        };
        return actionMap[step] || [];
    }

    getRelevantResources(step) {
        return [
            {
                type: 'video',
                title: 'How to apply for a loan',
                url: '/resources/loan-guide'
            },
            {
                type: 'doc',
                title: 'Required Documents',
                url: '/resources/documents'
            }
        ];
    }

    estimateTimeToComplete(currentStep) {
        const stepTimes = {
            'initial': 15,
            'mobile_email_collected': 10,
            'pan_verified': 20,
            'mutual_funds_checked': 15,
            'otp_verified': 5,
            'aadhaar_processed': 25,
            'bank_verified': 20,
            'mandate_sent': 10
        };

        let totalTime = 0;
        for (let step in stepTimes) {
            totalTime += stepTimes[step];
            if (step === currentStep) break;
        }
        return totalTime;
    }
}

module.exports = PredictiveEngine; 