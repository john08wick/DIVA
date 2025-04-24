const OpenAI = require('openai');

class PersonalizationEngine {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Initialize user preference categories
        this.preferenceCategories = {
            communicationStyle: ['formal', 'casual', 'technical', 'simple'],
            interactionPace: ['quick', 'detailed', 'step-by-step'],
            notificationPreference: ['email', 'sms', 'both', 'minimal'],
            assistanceLevel: ['high', 'medium', 'low']
        };

        // Store user profiles and their preferences
        this.userProfiles = new Map();
    }

    /**
     * Create or update user profile with learned preferences
     * @param {string} userId - Unique identifier for the user
     * @param {Object} interaction - Current interaction data
     */
    async updateUserProfile(userId, interaction) {
        let profile = this.userProfiles.get(userId) || this.createInitialProfile();
        
        // Analyze interaction for preference indicators
        const preferences = await this.analyzeInteractionPreferences(interaction);
        
        // Update profile with new insights
        profile = this.mergePreferences(profile, preferences);
        
        // Update behavioral patterns
        profile.patterns = this.updateBehavioralPatterns(profile.patterns, interaction);
        
        this.userProfiles.set(userId, profile);
        return profile;
    }

    /**
     * Create initial user profile with default values
     */
    createInitialProfile() {
        return {
            preferences: {
                communicationStyle: 'casual',
                interactionPace: 'step-by-step',
                notificationPreference: 'both',
                assistanceLevel: 'medium'
            },
            patterns: {
                commonQuestions: [],
                preferredTimes: [],
                completionRates: [],
                errorPatterns: []
            },
            lastInteraction: null,
            adaptations: []
        };
    }

    /**
     * Analyze interaction to identify user preferences
     * @param {Object} interaction - Current interaction data
     */
    async analyzeInteractionPreferences(interaction) {
        const prompt = `Analyze this user interaction and identify preferences:
        Interaction: ${JSON.stringify(interaction)}
        
        Consider:
        1. Communication style (formal/casual/technical/simple)
        2. Pace of interaction (quick/detailed/step-by-step)
        3. Level of assistance needed (high/medium/low)
        
        Respond with JSON containing identified preferences.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: prompt
            }],
            temperature: 0.3
        });

        return JSON.parse(response.choices[0].message.content);
    }

    /**
     * Merge new preferences with existing profile
     * @param {Object} profile - Existing user profile
     * @param {Object} newPreferences - Newly identified preferences
     */
    mergePreferences(profile, newPreferences) {
        Object.keys(newPreferences).forEach(key => {
            if (profile.preferences[key]) {
                // Weight new preferences with existing ones
                const currentWeight = 0.7; // Give more weight to established preferences
                const newWeight = 0.3;
                
                if (typeof profile.preferences[key] === 'string') {
                    // For categorical preferences, use the new value if confidence is high
                    if (newPreferences[key].confidence > 0.8) {
                        profile.preferences[key] = newPreferences[key].value;
                    }
                } else {
                    // For numerical preferences, use weighted average
                    profile.preferences[key] = 
                        (profile.preferences[key] * currentWeight) +
                        (newPreferences[key].value * newWeight);
                }
            }
        });
        return profile;
    }

    /**
     * Update behavioral patterns based on new interaction
     * @param {Object} patterns - Existing behavioral patterns
     * @param {Object} interaction - New interaction data
     */
    updateBehavioralPatterns(patterns, interaction) {
        // Update common questions
        if (interaction.question) {
            patterns.commonQuestions.push({
                question: interaction.question,
                timestamp: new Date(),
                context: interaction.context
            });
        }

        // Track preferred interaction times
        patterns.preferredTimes.push(new Date());
        if (patterns.preferredTimes.length > 100) {
            patterns.preferredTimes.shift(); // Keep last 100 interactions
        }

        // Update completion rates
        if (interaction.completionStatus) {
            patterns.completionRates.push({
                status: interaction.completionStatus,
                timestamp: new Date(),
                duration: interaction.duration
            });
        }

        // Track error patterns
        if (interaction.error) {
            patterns.errorPatterns.push({
                error: interaction.error,
                context: interaction.context,
                timestamp: new Date()
            });
        }

        return patterns;
    }

    /**
     * Generate personalized response based on user profile
     * @param {string} userId - User identifier
     * @param {string} baseResponse - Original response to personalize
     */
    async personalizeResponse(userId, baseResponse) {
        const profile = this.userProfiles.get(userId);
        if (!profile) return baseResponse;

        const prompt = `Personalize this response based on user preferences:
        Response: ${baseResponse}
        
        User Preferences:
        ${JSON.stringify(profile.preferences, null, 2)}
        
        Adjust:
        1. Tone and formality
        2. Detail level
        3. Technical complexity
        
        Maintain the same information while matching user's preferred style.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: prompt
            }],
            temperature: 0.4
        });

        return response.choices[0].message.content;
    }

    /**
     * Suggest proactive adaptations based on user patterns
     * @param {string} userId - User identifier
     */
    async suggestAdaptations(userId) {
        const profile = this.userProfiles.get(userId);
        if (!profile) return [];

        // Analyze patterns for potential improvements
        const patterns = profile.patterns;
        const suggestions = [];

        // Check for common questions and suggest FAQs
        if (patterns.commonQuestions.length > 0) {
            suggestions.push({
                type: 'faq',
                questions: this.identifyFrequentQuestions(patterns.commonQuestions)
            });
        }

        // Analyze completion rates and suggest optimizations
        if (patterns.completionRates.length > 0) {
            const completionAnalysis = this.analyzeCompletionRates(patterns.completionRates);
            if (completionAnalysis.needsImprovement) {
                suggestions.push({
                    type: 'process_optimization',
                    suggestions: completionAnalysis.suggestions
                });
            }
        }

        // Check error patterns and suggest preventive measures
        if (patterns.errorPatterns.length > 0) {
            suggestions.push({
                type: 'error_prevention',
                measures: this.generatePreventiveMeasures(patterns.errorPatterns)
            });
        }

        return suggestions;
    }

    /**
     * Identify frequently asked questions from user history
     * @param {Array} questions - Array of past questions
     */
    identifyFrequentQuestions(questions) {
        const questionCounts = {};
        questions.forEach(q => {
            const key = q.question.toLowerCase();
            questionCounts[key] = (questionCounts[key] || 0) + 1;
        });

        return Object.entries(questionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([question, count]) => ({
                question,
                frequency: count
            }));
    }

    /**
     * Analyze completion rates and suggest improvements
     * @param {Array} completionRates - Array of completion data
     */
    analyzeCompletionRates(completionRates) {
        const recent = completionRates.slice(-20); // Analyze last 20 interactions
        const successRate = recent.filter(r => r.status === 'completed').length / recent.length;

        return {
            needsImprovement: successRate < 0.8,
            suggestions: this.generateCompletionSuggestions(recent)
        };
    }

    /**
     * Generate suggestions for improving completion rates
     * @param {Array} recentCompletions - Recent completion data
     */
    generateCompletionSuggestions(recentCompletions) {
        const suggestions = [];
        
        // Analyze duration patterns
        const durations = recentCompletions.map(c => c.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        if (avgDuration > 300) { // If average duration > 5 minutes
            suggestions.push('Consider streamlining the process for quicker completion');
        }

        // Analyze failure points
        const failurePoints = recentCompletions
            .filter(c => c.status !== 'completed')
            .map(c => c.context);
            
        if (failurePoints.length > 0) {
            suggestions.push('Add additional guidance at common failure points');
        }

        return suggestions;
    }

    /**
     * Generate preventive measures based on error patterns
     * @param {Array} errorPatterns - Array of error data
     */
    generatePreventiveMeasures(errorPatterns) {
        const measures = [];
        const errorTypes = {};

        // Categorize errors
        errorPatterns.forEach(error => {
            const type = error.error.type;
            errorTypes[type] = (errorTypes[type] || 0) + 1;
        });

        // Generate measures for common errors
        Object.entries(errorTypes)
            .sort(([,a], [,b]) => b - a)
            .forEach(([type, count]) => {
                measures.push({
                    errorType: type,
                    frequency: count,
                    prevention: this.getPreventiveMeasure(type)
                });
            });

        return measures;
    }

    /**
     * Get preventive measure for specific error type
     * @param {string} errorType - Type of error
     */
    getPreventiveMeasure(errorType) {
        const preventiveMeasures = {
            'validation_error': 'Add real-time validation with clear requirements',
            'timeout_error': 'Implement progressive loading and status updates',
            'input_error': 'Provide input format examples and validation rules',
            'system_error': 'Add system status checks and automatic retry logic'
        };

        return preventiveMeasures[errorType] || 'Monitor and analyze error patterns';
    }
}

module.exports = PersonalizationEngine; 