const OpenAI = require('openai');
const LoanAPI = require('../api/loanApi');
const DocumentStore = require('../rag/documentStore');
const functions = require('../openai/functions');
const PredictiveEngine = require('./PredictiveEngine');
const AnalyticsEngine = require('./AnalyticsEngine');
const MediaHandler = require('./MediaHandler');
const PersonalizationEngine = require('./PersonalizationEngine');
const BankVerificationAPI = require('../api/bankVerificationApi');
const MutualFundFetchAPI = require('../api/mutualFundFetchApi');
const MutualFundPledgeAPI = require('../api/mutualFundPledgeApi');
const api = require('../utils/apiClient');

// Add logging utility
const logger = {
    info: (message, data = {}) => {
        console.log(`[INFO] ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = {}, data = {}) => {
        console.error(`[ERROR] ${message}`, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                response: error.response?.data
            },
            data
        });
    },
    debug: (message, data = {}) => {
        console.debug(`[DEBUG] ${message}`, JSON.stringify(data, null, 2));
    },
    warn: (message, data = {}) => {
        console.warn(`[WARN] ${message}`, JSON.stringify(data, null, 2));
    }
};

class LoanAssistant {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.loanApi = new LoanAPI();
        this.documentStore = new DocumentStore();
        this.predictiveEngine = new PredictiveEngine();
        this.analyticsEngine = new AnalyticsEngine();
        this.mediaHandler = new MediaHandler();
        this.personalizationEngine = new PersonalizationEngine();
        this.bankVerificationApi = BankVerificationAPI;
        this.mutualFundFetchApi = MutualFundFetchAPI;
        this.mutualFundPledgeApi = MutualFundPledgeAPI;
        this.kycApi = require('../api/kycApi');
        this.mandateApi = require('../api/mandateApi');
        this.agreementApi = require('../api/agreementApi');
        this.kfsApi = require('../api/kfsApi');
        
        this.conversationContext = {
            userInfo: {
                name: null,
                mobile: null,
                email: null,
                pan: null,
                address: {
                    line1: null,
                    line2: null,
                    city: null,
                    state: null,
                    pincode: null
                },
                kycVerified: false,
                lastUpdated: null
            },
            applicationState: {
                kycReferenceId: null,
                kycStatus: null,
                kycWebUrl: null,
                kycDeviation: null,
                bankAccountReferenceId: null,
                bankAccountStatus: null,
                bankAccountDetails: null,
                bankDeviation: null,
                mandateReferenceId: null,
                mandateStatus: null,
                mandateWebUrl: null,
                agreementReferenceId: null,
                agreementStatus: null,
                agreementWebUrl: null,
                kfsReferenceId: null,
                kfsStatus: null,
                kfsWebUrl: null,
                loanAccountId: null
            },
            conversationHistory: [],
            userSentiment: 'neutral',
            lastInteractionTime: null,
            failedAttempts: {},
            sessionDuration: 0,
            preferredLanguage: 'en',
            mediaUploads: [],
            insights: {},
            mutualFundContext: {
                fetchRequestId: null,
                pledgeRequestId: null,
                selectedFunds: [],
                pledgeAmount: null,
                pledgeDetails: null
            },
            messageStatus: {
                lastMessageId: null,
                status: null,
                timestamp: null,
                functionName: null
            }
        };

        // Initialize rate limiting
        this.rateLimits = new Map();
        this.maxRequestsPerMinute = 30;
        this.maxRequestsPerHour = 300;

        logger.info('LoanAssistant initialized with mutual fund APIs');
    }

    async initialize() {
        await this.documentStore.initialize();
    }

    async handleMessage(input, attachedMedia = null) {
        try {
            const messageId = this.generateMessageId();
            
            // Initial status - Processing
            this.updateMessageStatus(messageId, 'PROCESSING');
            
            // Validate and sanitize input
            input = this.validateInput(input);
            
            // Extract userId from input if available
            const userId = input.userId || 'anonymous';
            
            // Check rate limit
            this.checkRateLimit(userId);
            
            // Try to restore progress for returning users
            if (userId !== 'anonymous') {
                await this.restoreProgress(userId);
            }
            
            logger.info('Handling message', { input, attachedMedia });
            
            // Extract message from input if it's an object
            const message = typeof input === 'object' ? input.message : input;
            
            // Update session metrics
            this.updateSessionMetrics();
            
            // Detect language first
            const detectedLanguage = await this.detectLanguage(message);
            logger.debug('Detected language', { language: detectedLanguage });
            this.conversationContext.preferredLanguage = detectedLanguage;
            
            // Process any attached media
            if (attachedMedia) {
                const mediaAnalysis = await this.handleMediaUpload(attachedMedia);
                message = this.enrichMessageWithMediaContext(message, mediaAnalysis);
            }

            // Get predictive insights
            const predictions = await this.predictiveEngine.predictNextStep(this.conversationContext);
            
            // Analyze user sentiment
            const sentiment = await this.analyzeSentiment(message);
            this.conversationContext.userSentiment = sentiment;

            // Handle timeout/session expiry
            if (this.isSessionExpired()) {
                return {
                    messageId,
                    message: await this.translateText(
                        "Your session has expired. Let's start fresh. How can I help you today?",
                        detectedLanguage
                    ),
                    status: this.conversationContext.messageStatus
                };
            }

            // Store message in history with language info
            this.conversationContext.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date(),
                sentiment: sentiment,
                language: detectedLanguage,
                messageId
            });

            // Check for repeated failures or confusion
            if (this.detectUserFrustration()) {
                return await this.handleUserFrustration(detectedLanguage);
            }

            // Regular message handling
            let response;
            if (this.isGeneralQuestion(message)) {
                response = await this.handleGeneralQuestion(message);
            } else {
                // Add language context to the conversation
                logger.debug('Making OpenAI API call with context:', {
                    messageHistory: this.buildConversationHistory(message),
                    language: detectedLanguage
                });

                const aiResponse = await this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        ...this.buildConversationHistory(message),
                        {
                            role: "system",
                            content: `The user is communicating in ${detectedLanguage}. Generate a response that will be translated to their language.`
                        }
                    ],
                    functions: functions,
                    function_call: "auto",
                    temperature: this.calculateDynamicTemperature()
                });

                const assistantMessage = aiResponse.choices[0].message;
                
                logger.debug('OpenAI API Response:', {
                    message: assistantMessage.content,
                    functionCall: assistantMessage.function_call,
                    model: aiResponse.model,
                    usage: aiResponse.usage
                });
                
                if (assistantMessage.function_call) {
                    // Update status to SENT when function is identified
                    this.updateMessageStatus(messageId, 'SENT', assistantMessage.function_call.name);
                    
                    logger.info('Function call identified:', {
                        name: assistantMessage.function_call.name,
                        arguments: assistantMessage.function_call.arguments,
                        messageId
                    });
                    
                    const result = await this.handleFunctionCall(assistantMessage.function_call, messageId);
                    this.updateContext(assistantMessage.function_call.name, result);
                    response = {
                        messageId,
                        message: result.message,
                        success: result.success,
                        functionCall: assistantMessage.function_call,
                        status: this.conversationContext.messageStatus
                    };
                } else {
                    // Update status to DELIVERED for direct messages
                    this.updateMessageStatus(messageId, 'DELIVERED');
                    response = {
                        messageId,
                        message: assistantMessage.content,
                        suggestedActions: [],
                        status: this.conversationContext.messageStatus
                    };
                }
            }

            // Enrich response with insights
            const enrichedResponse = await this.enrichResponseWithInsights(response, predictions);
            
            // Ensure the response is in the same language as the input
            const translatedResponse = await this.ensureLanguageConsistency(enrichedResponse, detectedLanguage);
            
            // Store the translated response
            this.storeAssistantResponse({
                ...translatedResponse,
                messageId,
                status: this.conversationContext.messageStatus
            });
            
            logger.info('Message handled successfully', { response: translatedResponse });

            // Save progress after processing
            if (userId !== 'anonymous') {
                await this.saveProgress(userId);
            }
            
            return response;

        } catch (error) {
            // Update status to ERROR in case of failure
            this.updateMessageStatus(messageId, 'ERROR');
            logger.error('Error in handleMessage', error);
            const errorResponse = await this.handleError(error);
            return {
                messageId,
                success: false,
                message: `Error: ${error.message}`,
                error: error,
                status: this.conversationContext.messageStatus
            };
        }
    }

    async handleMediaUpload(media) {
        const analysis = await this.mediaHandler.processMedia(media, media.type);
        this.conversationContext.mediaUploads.push({
            type: media.type,
            timestamp: new Date(),
            analysis
        });
        return analysis;
    }

    enrichMessageWithMediaContext(message, mediaAnalysis) {
        return `${message}\n\nAttached document analysis: ${JSON.stringify(mediaAnalysis)}`;
    }

    async enrichResponseWithInsights(response, predictions) {
        // Add relevant insights and suggestions to the response
        const enrichedResponse = {
            message: response,
            suggestedActions: predictions.suggestedActions || [],
            helpfulResources: predictions.helpfulResources || [],
            timeEstimate: predictions.timeEstimate
        };

        if (predictions.potentialIssues && predictions.potentialIssues.length > 0) {
            enrichedResponse.warnings = predictions.potentialIssues;
        }

        return enrichedResponse;
    }

    async handleError(error) {
        // Log error for analytics
        this.analyticsEngine.addUserFeedback({
            type: 'error',
            message: error.message,
            stack: error.stack
        });

        const language = this.conversationContext.preferredLanguage;
        return {
            message: await this.translateText(
                "I apologize, but I encountered an error. Let me help you get back on track.",
                language
            ),
            suggestedActions: await Promise.all([
                this.translateText("Would you like to try again?", language),
                this.translateText("Should we start from the last successful step?", language),
                this.translateText("Would you like to speak with a human agent?", language)
            ])
        };
    }

    async analyzeSentiment(message) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "Analyze the sentiment of this message and respond with only one word: positive, negative, or neutral."
            }, {
                role: "user",
                content: message
            }],
            temperature: 0.3
        });
        return response.choices[0].message.content.trim().toLowerCase();
    }

    detectUserFrustration() {
        const recentMessages = this.conversationContext.conversationHistory.slice(-3);
        const negativeCount = recentMessages.filter(msg => msg.sentiment === 'negative').length;
        const hasRepeatedQuestions = this.checkForRepeatedQuestions(recentMessages);
        return negativeCount >= 2 || hasRepeatedQuestions;
    }

    async handleUserFrustration(language) {
        // Reset failed attempts
        this.conversationContext.failedAttempts = {};
        
        const response = {
            message: await this.translateText(`I understand this might be frustrating. Would you like me to:
1. Connect you with a human agent
2. Explain the process again in simpler terms
3. Start over from the beginning
Please choose an option that works best for you.`, language),
            suggestedActions: await Promise.all([
                this.translateText("Connect with a human agent", language),
                this.translateText("Get a simpler explanation", language),
                this.translateText("Start over", language)
            ])
        };
        
        this.storeAssistantResponse(response);
        return response;
    }

    calculateDynamicTemperature() {
        // Adjust temperature based on conversation context
        if (this.conversationContext.userSentiment === 'negative') {
            return 0.3; // More focused and precise
        }
        if (this.detectUserFrustration()) {
            return 0.2; // Very precise and straightforward
        }
        return 0.7; // Default - more creative
    }

    async detectLanguage(text) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "Detect the language of this text and respond with only the ISO 639-1 language code (e.g., 'en' for English, 'mr' for Marathi, 'hi' for Hindi, 'ta' for Tamil, etc.). Return only the language code, nothing else."
            }, {
                role: "user",
                content: text
            }],
            temperature: 0.1
        });
        const langCode = response.choices[0].message.content.trim().toLowerCase();
        console.log('Detected language code:', langCode); // For debugging
        return langCode;
    }

    async formatResponse(response, predictions) {
        // Format response based on user's preferred language
        if (this.conversationContext.preferredLanguage !== 'en') {
            return await this.translateFullResponse(response, predictions, this.conversationContext.preferredLanguage);
        }
        return response;
    }

    async translateFullResponse(response, predictions, targetLanguage) {
        // If response is an object with message and other components
        if (typeof response === 'object' && response.message) {
            const translatedResponse = {
                message: await this.translateText(response.message, targetLanguage)
            };

            // Translate suggested actions
            if (response.suggestedActions && Array.isArray(response.suggestedActions)) {
                translatedResponse.suggestedActions = await Promise.all(
                    response.suggestedActions.map(action => 
                        this.translateText(action, targetLanguage)
                    )
                );
            }

            // Translate helpful resources
            if (response.helpfulResources && Array.isArray(response.helpfulResources)) {
                translatedResponse.helpfulResources = await Promise.all(
                    response.helpfulResources.map(async resource => ({
                        ...resource,
                        title: await this.translateText(resource.title, targetLanguage)
                    }))
                );
            }

            // Keep non-text fields as is
            if (response.timeEstimate) {
                translatedResponse.timeEstimate = response.timeEstimate;
            }

            return translatedResponse;
        }

        // If response is just a string
        return await this.translateText(response, targetLanguage);
    }

    async translateText(text, targetLanguage) {
        // If text is an object, extract the message
        const textToTranslate = typeof text === 'object' ? text.message : text;
        
        // If no text to translate, return empty string
        if (!textToTranslate) {
            return '';
        }

        const languageNames = {
            'mr': 'Marathi',
            'hi': 'Hindi',
            'kn': 'Kannada',
            'ta': 'Tamil',
            'te': 'Telugu',
            'gu': 'Gujarati',
            'bn': 'Bengali',
            'ml': 'Malayalam',
            'pa': 'Punjabi',
            'en': 'English'
        };

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `Translate the following text to ${languageNames[targetLanguage] || targetLanguage}. 
                         Maintain the same meaning, tone, and formality level. 
                         Ensure the translation is natural and culturally appropriate.`
            }, {
                role: "user",
                content: textToTranslate
            }],
            temperature: 0.3
        });
        return response.choices[0].message.content.trim();
    }

    updateSessionMetrics() {
        const now = new Date();
        if (this.conversationContext.lastInteractionTime) {
            const timeDiff = now - this.conversationContext.lastInteractionTime;
            this.conversationContext.sessionDuration += timeDiff;
        }
        this.conversationContext.lastInteractionTime = now;
    }

    isSessionExpired() {
        if (!this.conversationContext.lastInteractionTime) return false;
        const inactiveTime = new Date() - this.conversationContext.lastInteractionTime;
        return inactiveTime > 30 * 60 * 1000; // 30 minutes
    }

    checkForRepeatedQuestions(messages) {
        const questions = messages.map(msg => msg.content);
        return new Set(questions).size < questions.length;
    }

    storeAssistantResponse(response) {
        this.conversationContext.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: new Date(),
            messageId: response.messageId,
            status: response.status
        });
    }

    isGeneralQuestion(message) {
        const generalQuestionPatterns = [
            /what is/i,
            /how long/i,
            /can you explain/i,
            /tell me about/i,
            /why do/i
        ];
        return generalQuestionPatterns.some(pattern => pattern.test(message));
    }

    async handleGeneralQuestion(question) {
        const documents = await this.documentStore.searchDocuments(question);
        if (documents.length > 0) {
            return documents[0].pageContent;
        }
        return "I apologize, but I don't have specific information about that. Please ask about the loan application process or proceed with your application.";
    }

    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Don't retry if it's a validation error or unauthorized
                if (error.status === 400 || error.status === 401) {
                    throw error;
                }
                
                logger.warn(`Attempt ${attempt} failed`, { error });
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }
        
        throw lastError;
    }

    async handleFunctionCall({ name, arguments: args }, messageId) {
        logger.info('Handling function call', { name, args, messageId });
        
        const params = JSON.parse(args);
        
        try {
            // Validate parameters based on function name
            this.validateFunctionParams(name, params);
            
            // Update status to DELIVERED when API call starts
            this.updateMessageStatus(messageId, 'DELIVERED', name);
            
            let result;
            switch (name) {
                case 'send_otp_fetch_mf_portfolio':
                    result = await this.retryOperation(() => 
                        this.mutualFundFetchApi.sendOTPForMFPortfolio(params)
                    );
                    if (result.success) {
                        this.conversationContext.mutualFundContext.fetchRequestId = result.fetchRequestId;
                    }
                    break;
                
                case 'validate_otp_fetch_mf_portfolio':
                    result = await this.mutualFundFetchApi.validateOTPForMFPortfolio(
                        this.conversationContext.mutualFundContext.fetchRequestId,
                        params.otp
                    );
                    break;
                
                case 'get_fetch_mf_details':
                    result = await this.mutualFundFetchApi.getMFPortfolioDetails(
                        this.conversationContext.mutualFundContext.fetchRequestId
                    );
                    if (result.success && result.portfolioDetails) {
                        this.conversationContext.mutualFundContext.selectedFunds = result.portfolioDetails.funds;
                    }
                    break;
                
                case 'send_otp_pledge_mf_portfolio':
                    result = await this.mutualFundPledgeApi.sendOTPForPledge({
                        ...params,
                        funds: this.conversationContext.mutualFundContext.selectedFunds.map(fund => ({
                            isin: fund.isin,
                            folioNumber: fund.folioNumber,
                            provider: fund.provider,
                            units: fund.units,
                            modeOfHolding: 'SI' // Default to Single holding
                        }))
                    });
                    if (result.success) {
                        this.conversationContext.mutualFundContext.pledgeRequestId = result.data.pledgeRequestId;
                    }
                    break;
                
                case 'validate_otp_pledge_mf_portfolio':
                    result = await this.mutualFundPledgeApi.validateOTP(
                        this.conversationContext.mutualFundContext.pledgeRequestId,
                        params.otp
                    );
                    break;
                
                case 'get_pledged_mf_details':
                    result = await this.mutualFundPledgeApi.getPledgeDetails(
                        this.conversationContext.mutualFundContext.pledgeRequestId
                    );
                    break;
                
                case 'initiate_bank_verification':
                    result = await this.initiateBankVerification(params);
                    break;
                
                case 'get_bank_verification_status':
                    result = await this.getBankVerificationStatus(params);
                    break;
                
                case 'initiate_mutual_fund_pledge':
                    result = await this.initiateMutualFundPledge(params);
                    break;
                
                case 'validate_mutual_fund_pledge_otp':
                    result = await this.validateMutualFundPledgeOtp(params);
                    break;
                
                case 'initiate_kyc':
                    result = await this.initiateKyc(params);
                    break;
                
                case 'get_kyc_status':
                    result = await this.getKycStatus(params);
                    break;
                
                case 'handle_kyc_deviation':
                    result = await this.handleKycDeviation(params);
                    break;
                
                case 'setup_mandate':
                    result = await this.setupMandate(params);
                    break;
                
                case 'get_mandate_status':
                    result = await this.getMandateStatus(params);
                    break;
                
                case 'create_loan_account':
                    result = await this.createLoanAccount(params);
                    break;
                
                default:
                    throw new Error(`Unknown function: ${name}`);
            }

            logger.info('Function call completed successfully', { name, result });
            return {
                ...result,
                messageId,
                status: this.conversationContext.messageStatus
            };

        } catch (error) {
            // Update status to ERROR in case of API failure
            this.updateMessageStatus(messageId, 'ERROR', name);
            logger.error('Function call failed', error, { name, args, messageId });
            
            if (error instanceof api.AuthenticationError) {
                return {
                    success: false,
                    message: "Authentication failed. Please ensure the system is properly configured.",
                    error: error,
                    messageId,
                    status: this.conversationContext.messageStatus
                };
            } else if (error instanceof api.ApiError) {
                return {
                    success: false,
                    message: `API Error: ${error.message}`,
                    error: error,
                    messageId,
                    status: this.conversationContext.messageStatus
                };
            }
            
            return {
                success: false,
                message: `Error processing request: ${error.message}`,
                error: error,
                messageId,
                status: this.conversationContext.messageStatus
            };
        }
    }

    async initiateBankVerification(params) {
        logger.info('Initiating bank verification', { params });
        
        try {
            // Validate required parameters
            const requiredParams = ['opportunityId', 'bankAccountNumber', 'ifscCode', 'bankName', 'bankAccountType'];
            const missingParams = requiredParams.filter(param => !params[param]);
            if (missingParams.length > 0) {
                const error = new Error(`Missing required parameters: ${missingParams.join(', ')}`);
                logger.error('Parameter validation failed', error, { missingParams });
                throw error;
            }

            // Validate bank account type
            if (!['SAVINGS_ACCOUNT', 'CURRENT_ACCOUNT'].includes(params.bankAccountType)) {
                const error = new Error('Invalid bank account type. Must be either SAVINGS_ACCOUNT or CURRENT_ACCOUNT');
                logger.error('Bank account type validation failed', error, { providedType: params.bankAccountType });
                throw error;
            }

            logger.debug('Making API call to initiate bank verification', { 
                api: 'bankVerificationApi',
                method: 'initiateBankVerification',
                params 
            });

            const response = await this.bankVerificationApi.initiateBankVerification(params);
            
            logger.info('Bank verification initiated successfully', { response });
            return response;

        } catch (error) {
            logger.error('Error in initiateBankVerification', error, { params });
            throw error;
        }
    }

    async getBankVerificationStatus(params) {
        logger.info('Getting bank verification status', { params });
        
        try {
            // Validate required parameters
            if (!params.utilityReferenceId) {
                const error = new Error('Missing required parameter: utilityReferenceId');
                logger.error('Parameter validation failed', error, { params });
                throw error;
            }

            logger.debug('Making API call to get bank verification status', {
                api: 'bankVerificationApi',
                method: 'getBankVerificationStatus',
                utilityReferenceId: params.utilityReferenceId
            });

            const response = await this.bankVerificationApi.getBankVerificationStatus(params.utilityReferenceId);
            
            logger.info('Retrieved bank verification status successfully', { response });
            return response;

        } catch (error) {
            logger.error('Error in getBankVerificationStatus', error, { params });
            throw error;
        }
    }

    async initiateMutualFundPledge(params) {
        try {
            logger.info('Initiating mutual fund pledge', params);
            const response = await this.mutualFundPledgeApi.sendOtp({
                opportunityId: params.opportunityId,
                pan: params.pan,
                amount: params.amount
            });

            if (response.success) {
                this.conversationContext.mutualFundContext.pledgeRequestId = response.data.utilityReferenceId;
                return {
                    success: true,
                    message: "OTP sent successfully for mutual fund pledge verification.",
                    data: response.data
                };
            }

            throw new Error('Failed to initiate mutual fund pledge');
        } catch (error) {
            logger.error('Error in mutual fund pledge initiation', error, params);
            return {
                success: false,
                message: `Error initiating mutual fund pledge: ${error.message}`,
                error: error
            };
        }
    }

    async validateMutualFundPledgeOtp(params) {
        try {
            logger.info('Validating mutual fund pledge OTP', params);
            const response = await this.mutualFundPledgeApi.validateOtp({
                utilityReferenceId: params.utilityReferenceId,
                otp: params.otp
            });

            if (response.success) {
                const pledgeDetails = await this.mutualFundPledgeApi.getPledgeDetails(params.utilityReferenceId);
                return {
                    success: true,
                    message: "Mutual fund pledge verified successfully.",
                    data: pledgeDetails.data
                };
            }

            throw new Error('Failed to validate mutual fund pledge OTP');
        } catch (error) {
            logger.error('Error in mutual fund pledge OTP validation', error, params);
            return {
                success: false,
                message: `Error validating pledge OTP: ${error.message}`,
                error: error
            };
        }
    }

    async initiateKyc(params) {
        try {
            logger.info('Initiating KYC process', params);
            const response = await this.kycApi.initiateKyc({
                opportunityId: params.opportunityId,
                redirectUrl: params.redirectUrl
            });

            if (response.success) {
                this.conversationContext.applicationState.kycReferenceId = response.data.utilityReferenceId;
                this.conversationContext.applicationState.kycWebUrl = response.data.webUrl;
                return {
                    success: true,
                    message: "KYC process initiated successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to initiate KYC process');
        } catch (error) {
            logger.error('Error in KYC initiation', error, params);
            return {
                success: false,
                message: `Error initiating KYC: ${error.message}`,
                error: error
            };
        }
    }

    async getKycStatus(params) {
        try {
            logger.info('Checking KYC status', params);
            const response = await this.kycApi.getKycStatus(params.utilityReferenceId);

            if (response.success) {
                this.conversationContext.applicationState.kycStatus = response.data.status;
                this.conversationContext.applicationState.kycDeviation = response.data.deviationDetails;
                return {
                    success: true,
                    message: "KYC status retrieved successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to get KYC status');
        } catch (error) {
            logger.error('Error in getting KYC status', error, params);
            return {
                success: false,
                message: `Error getting KYC status: ${error.message}`,
                error: error
            };
        }
    }

    async handleKycDeviation(params) {
        try {
            logger.info('Handling KYC deviation', params);
            const response = await this.kycApi.submitDeviation({
                utilityReferenceId: params.utilityReferenceId,
                documents: params.documents
            });

            if (response.success) {
                return {
                    success: true,
                    message: "KYC deviation handled successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to handle KYC deviation');
        } catch (error) {
            logger.error('Error in handling KYC deviation', error, params);
            return {
                success: false,
                message: `Error handling KYC deviation: ${error.message}`,
                error: error
            };
        }
    }

    async setupMandate(params) {
        try {
            logger.info('Setting up mandate', params);
            const response = await this.mandateApi.initiateMandateSetup({
                opportunityId: params.opportunityId,
                bankAccountVerificationId: params.bankAccountVerificationId,
                endDate: params.endDate,
                mandateType: params.mandateType,
                mandateAmount: params.mandateAmount,
                redirectionUrl: params.redirectionUrl
            });

            if (response.success) {
                this.conversationContext.applicationState.mandateReferenceId = response.data.utilityReferenceId;
                this.conversationContext.applicationState.mandateWebUrl = response.data.webUrl;
                return {
                    success: true,
                    message: "Mandate setup initiated successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to setup mandate');
        } catch (error) {
            logger.error('Error in mandate setup', error, params);
            return {
                success: false,
                message: `Error setting up mandate: ${error.message}`,
                error: error
            };
        }
    }

    async getMandateStatus(params) {
        try {
            logger.info('Checking mandate status', params);
            const response = await this.mandateApi.getMandateStatus(params.utilityReferenceId);

            if (response.success) {
                this.conversationContext.applicationState.mandateStatus = response.data.status;
                return {
                    success: true,
                    message: "Mandate status retrieved successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to get mandate status');
        } catch (error) {
            logger.error('Error in getting mandate status', error, params);
            return {
                success: false,
                message: `Error getting mandate status: ${error.message}`,
                error: error
            };
        }
    }

    async createLoanAccount(params) {
        try {
            logger.info('Creating loan account', params);
            const response = await this.loanApi.createLoanAccount({
                opportunityId: params.opportunityId,
                pledgeReferenceId: this.conversationContext.mutualFundContext.pledgeRequestId,
                kycReferenceId: this.conversationContext.applicationState.kycReferenceId,
                bankAccountReferenceId: this.conversationContext.applicationState.bankAccountReferenceId,
                mandateReferenceId: this.conversationContext.applicationState.mandateReferenceId,
                agreementReferenceId: this.conversationContext.applicationState.agreementReferenceId,
                kfsReferenceId: this.conversationContext.applicationState.kfsReferenceId
            });

            if (response.success) {
                this.conversationContext.applicationState.loanAccountId = response.data.loanAccountId;
                return {
                    success: true,
                    message: "Loan account created successfully.",
                    data: response.data
                };
            }

            throw new Error('Failed to create loan account');
        } catch (error) {
            logger.error('Error in loan account creation', error, params);
            return {
                success: false,
                message: `Error creating loan account: ${error.message}`,
                error: error
            };
        }
    }

    buildConversationHistory(newMessage) {
        const messages = [
            {
                role: "system",
                content: `You are a helpful loan application assistant. Guide the user through the following steps:
                1. Contact Information Collection & Verification
                   - Get and verify mobile number and email
                   - Send and validate OTPs for both
                
                2. Identity Verification
                   - Collect PAN details
                   - Initiate KYC process
                   - Guide through KYC completion
                   - Handle any KYC deviations if they occur
                
                3. Mutual Fund Processing
                   a. Portfolio Fetch
                      - Send OTP for fetching portfolio
                      - Validate OTP
                      - Review portfolio details
                   b. Fund Pledge
                      - Select eligible funds
                      - Initiate pledge process
                      - Send and validate pledge OTP
                      - Confirm pledge status
                
                4. Bank Account Setup
                   - Collect bank account details
                   - Verify account through penny drop
                   - Handle any verification failures
                
                5. Mandate Setup
                   - Setup NACH mandate
                   - Guide through e-NACH process
                   - Verify mandate status
                
                6. Documentation
                   - Setup loan agreement
                   - Process KFS (Key Fact Statement)
                   - Ensure all documents are signed
                
                7. Loan Account Creation
                   - Verify all prerequisites
                   - Create loan account
                   - Confirm setup completion

                Current Progress:
                - Contact Verification: ${this.getVerificationStatus('contact')}
                - KYC Status: ${this.getVerificationStatus('kyc')}
                - Mutual Funds: ${this.getVerificationStatus('mutualFunds')}
                - Bank Account: ${this.getVerificationStatus('bankAccount')}
                - Mandate: ${this.getVerificationStatus('mandate')}
                - Documentation: ${this.getVerificationStatus('documentation')}
                
                Maintain context and guide user based on their current progress.`
            }
        ];

        // Add context from previous interactions
        if (this.conversationContext.userInfo.mobile && this.conversationContext.userInfo.email) {
            messages.push({
                role: "system",
                content: `User's contact: Mobile: ${this.conversationContext.userInfo.mobile}, Email: ${this.conversationContext.userInfo.email}`
            });
        }

        if (this.conversationContext.userInfo.pan) {
            messages.push({
                role: "system",
                content: `User's PAN: ${this.conversationContext.userInfo.pan}, Name: ${this.conversationContext.userInfo.name || 'Not available'}`
            });
        }

        if (this.conversationContext.mutualFundContext.selectedFunds.length > 0) {
            messages.push({
                role: "system",
                content: `Selected Mutual Funds: ${JSON.stringify(this.conversationContext.mutualFundContext.selectedFunds)}`
            });
        }

        if (this.conversationContext.applicationState.bankAccountDetails) {
            messages.push({
                role: "system",
                content: `Bank Account: ${JSON.stringify(this.conversationContext.applicationState.bankAccountDetails)}`
            });
        }

        // Add the new message
        messages.push({
            role: "user",
            content: newMessage
        });

        return messages;
    }

    getVerificationStatus(step) {
        switch (step) {
            case 'contact':
                return this.conversationContext.userInfo.mobile && this.conversationContext.userInfo.email ? 'COMPLETED' : 'PENDING';
            case 'kyc':
                return this.conversationContext.applicationState.kycStatus || 'NOT_STARTED';
            case 'mutualFunds':
                return this.conversationContext.mutualFundContext.pledgeRequestId ? 'PLEDGED' : 
                       this.conversationContext.mutualFundContext.selectedFunds.length > 0 ? 'FETCHED' : 'NOT_STARTED';
            case 'bankAccount':
                return this.conversationContext.applicationState.bankAccountStatus || 'NOT_STARTED';
            case 'mandate':
                return this.conversationContext.applicationState.mandateStatus || 'NOT_STARTED';
            case 'documentation':
                return (this.conversationContext.applicationState.agreementStatus === 'COMPLETED' && 
                       this.conversationContext.applicationState.kfsStatus === 'COMPLETED') ? 'COMPLETED' : 'PENDING';
            default:
                return 'NOT_STARTED';
        }
    }

    updateContext(functionName, result) {
        // Update last interaction time
        this.conversationContext.lastInteractionTime = new Date();
        
        switch (functionName) {
            case 'create_lead':
                this.conversationContext.userInfo.mobile = result.mobile;
                this.conversationContext.userInfo.email = result.email;
                this.conversationContext.userInfo.lastUpdated = new Date();
                break;
                
            case 'verify_pan':
                this.conversationContext.userInfo.pan = result.pan;
                this.conversationContext.userInfo.name = result.name;
                this.conversationContext.panReferenceId = result.referenceId;
                this.conversationContext.userInfo.lastUpdated = new Date();
                break;
                
            case 'initiate_kyc':
                this.conversationContext.applicationState.kycReferenceId = result.data?.utilityReferenceId;
                this.conversationContext.applicationState.kycWebUrl = result.data?.webUrl;
                this.conversationContext.applicationState.kycStatus = 'INITIATED';
                break;
                
            case 'get_kyc_status':
                this.conversationContext.applicationState.kycStatus = result.data?.status;
                this.conversationContext.applicationState.kycDeviation = result.data?.deviationDetails;
                this.conversationContext.userInfo.kycVerified = result.data?.status === 'APPROVED';
                break;
                
            case 'initiate_bank_verification':
                this.conversationContext.applicationState.bankAccountReferenceId = result.data?.utilityReferenceId;
                this.conversationContext.applicationState.bankAccountDetails = {
                    accountNumber: result.data?.bankAccountNumber,
                    ifscCode: result.data?.ifscCode,
                    bankName: result.data?.bankName,
                    accountType: result.data?.bankAccountType
                };
                break;
                
            case 'setup_mandate':
                this.conversationContext.applicationState.mandateReferenceId = result.data?.utilityReferenceId;
                this.conversationContext.applicationState.mandateWebUrl = result.data?.webUrl;
                this.conversationContext.applicationState.mandateStatus = 'INITIATED';
                break;
                
            case 'send_otp_fetch_mf_portfolio':
                this.conversationContext.mutualFundContext.fetchRequestId = result.data?.fetchRequestId;
                break;
                
            case 'get_fetch_mf_details':
                if (result.success && result.portfolioDetails) {
                    this.conversationContext.mutualFundContext.selectedFunds = result.portfolioDetails.funds;
                }
                break;
                
            case 'send_otp_pledge_mf_portfolio':
                this.conversationContext.mutualFundContext.pledgeRequestId = result.data?.pledgeRequestId;
                this.conversationContext.mutualFundContext.pledgeAmount = result.data?.amount;
                break;
        }
        
        // Log context update
        logger.debug('Context updated', {
            functionName,
            updatedContext: this.conversationContext
        });
    }

    async generateResponse(result, predictions) {
        // Generate base response based on the API result
        let baseResponse;
        if (result.status === 'success') {
            baseResponse = "Great! Let's proceed with the next step.";
        } else if (result.status === 'pending') {
            baseResponse = "I'll check the status in a moment.";
        } else {
            baseResponse = "There seems to be an issue. Could you please try again?";
        }

        // Return response object with message and any additional information
        return {
            message: baseResponse,
            status: result.status,
            nextSteps: predictions.nextSteps || [],
            suggestedActions: predictions.suggestedActions || []
        };
    }

    /**
     * Process user input with personalization
     * @param {string} userId - User identifier
     * @param {string} input - User input text
     */
    async processInput(userId, input) {
        // Detect input language
        const detectedLanguage = await this.detectLanguage(input);
        this.conversationContext.preferredLanguage = detectedLanguage;

        const interaction = {
            question: input,
            timestamp: new Date(),
            context: this.currentContext || 'general',
            language: detectedLanguage
        };

        try {
            // Update user profile with new interaction
            await this.personalizationEngine.updateUserProfile(userId, interaction);

            // Get base response
            const baseResponse = await this.generateResponse(input);

            // Ensure response is in the same language as input
            const translatedResponse = await this.ensureLanguageConsistency(baseResponse, detectedLanguage);

            // Check for potential adaptations
            const adaptations = await this.personalizationEngine.suggestAdaptations(userId);
            if (adaptations.length > 0) {
                this.handleAdaptations(adaptations);
            }

            return translatedResponse;

        } catch (error) {
            interaction.error = {
                type: error.name,
                message: error.message
            };
            await this.personalizationEngine.updateUserProfile(userId, interaction);
            throw error;
        }
    }

    /**
     * Handle suggested adaptations
     * @param {Array} adaptations - List of suggested adaptations
     */
    async handleAdaptations(adaptations) {
        adaptations.forEach(adaptation => {
            switch (adaptation.type) {
                case 'faq':
                    this.updateFAQs(adaptation.questions);
                    break;
                case 'process_optimization':
                    this.optimizeProcess(adaptation.suggestions);
                    break;
                case 'error_prevention':
                    this.implementPreventiveMeasures(adaptation.measures);
                    break;
            }
        });
    }

    /**
     * Update FAQ database with new frequent questions
     * @param {Array} questions - New frequently asked questions
     */
    updateFAQs(questions) {
        // Implementation for updating FAQs
        this.faqDatabase = this.faqDatabase || new Map();
        questions.forEach(q => {
            this.faqDatabase.set(q.question, {
                frequency: q.frequency,
                lastUpdated: new Date()
            });
        });
    }

    /**
     * Optimize process based on suggestions
     * @param {Array} suggestions - Process optimization suggestions
     */
    optimizeProcess(suggestions) {
        // Implementation for process optimization
        suggestions.forEach(suggestion => {
            // Log suggestions for review
            console.log('Process Optimization Suggestion:', suggestion);
            // TODO: Implement automatic optimizations where possible
        });
    }

    /**
     * Implement preventive measures for common errors
     * @param {Array} measures - Preventive measures to implement
     */
    implementPreventiveMeasures(measures) {
        // Implementation for error prevention
        measures.forEach(measure => {
            this.errorPreventionStrategies = this.errorPreventionStrategies || new Map();
            this.errorPreventionStrategies.set(measure.errorType, {
                prevention: measure.prevention,
                frequency: measure.frequency,
                lastUpdated: new Date()
            });
        });
    }

    async ensureLanguageConsistency(response, targetLanguage) {
        if (targetLanguage === 'en') {
            return response;
        }

        // If response is null or undefined, return empty object
        if (!response) {
            return { message: '' };
        }

        // If response is a string, translate it directly
        if (typeof response === 'string') {
            return {
                message: await this.translateText(response, targetLanguage)
            };
        }

        const translatedResponse = {};

        // Translate message if it exists
        if (response.message) {
            translatedResponse.message = await this.translateText(response.message, targetLanguage);
        }

        // Translate suggested actions if they exist
        if (response.suggestedActions && Array.isArray(response.suggestedActions)) {
            translatedResponse.suggestedActions = await Promise.all(
                response.suggestedActions.filter(action => action) // Filter out null/undefined values
                    .map(action => this.translateText(action, targetLanguage))
            );
        }

        // Translate helpful resources if they exist
        if (response.helpfulResources && Array.isArray(response.helpfulResources)) {
            translatedResponse.helpfulResources = await Promise.all(
                response.helpfulResources.filter(resource => resource) // Filter out null/undefined values
                    .map(async resource => ({
                        ...resource,
                        title: await this.translateText(resource.title, targetLanguage)
                    }))
            );
        }

        // Copy non-translatable fields
        Object.keys(response).forEach(key => {
            if (!translatedResponse[key] && typeof response[key] !== 'string') {
                translatedResponse[key] = response[key];
            }
        });

        return translatedResponse;
    }

    async saveProgress(userId) {
        try {
            // Save progress to a persistent store
            await this.documentStore.saveDocument(`user_progress_${userId}`, {
                timestamp: new Date(),
                context: this.conversationContext
            });
            
            logger.info('Progress saved successfully', { userId });
        } catch (error) {
            logger.error('Error saving progress', error, { userId });
        }
    }

    async restoreProgress(userId) {
        try {
            const savedProgress = await this.documentStore.getDocument(`user_progress_${userId}`);
            if (savedProgress && savedProgress.context) {
                // Restore only if saved progress is less than 24 hours old
                const savedTime = new Date(savedProgress.timestamp);
                const now = new Date();
                if ((now - savedTime) < 24 * 60 * 60 * 1000) {
                    this.conversationContext = savedProgress.context;
                    logger.info('Progress restored successfully', { userId });
                    return true;
                }
            }
            return false;
        } catch (error) {
            logger.error('Error restoring progress', error, { userId });
            return false;
        }
    }

    validateInput(input) {
        // Basic input validation
        if (!input) {
            throw new Error('Input is required');
        }

        if (typeof input === 'string') {
            return this.sanitizeInput(input);
        }

        if (typeof input === 'object') {
            if (!input.message) {
                throw new Error('Message is required in input object');
            }
            return {
                ...input,
                message: this.sanitizeInput(input.message)
            };
        }

        throw new Error('Invalid input format');
    }

    sanitizeInput(text) {
        if (typeof text !== 'string') {
            return '';
        }

        // Remove any potential script tags
        text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove other HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Remove multiple spaces
        text = text.replace(/\s+/g, ' ');
        
        // Trim whitespace
        text = text.trim();
        
        // Limit length
        text = text.slice(0, 1000);
        
        return text;
    }

    validatePAN(pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(pan);
    }

    validateBankAccount(accountNumber) {
        // Basic validation for bank account numbers
        const accountRegex = /^[0-9]{9,18}$/;
        return accountRegex.test(accountNumber);
    }

    validateIFSC(ifsc) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        return ifscRegex.test(ifsc);
    }

    validateFunctionParams(functionName, params) {
        switch (functionName) {
            case 'initiate_bank_verification':
                if (!this.validateBankAccount(params.bankAccountNumber)) {
                    throw new Error('Invalid bank account number');
                }
                if (!this.validateIFSC(params.ifscCode)) {
                    throw new Error('Invalid IFSC code');
                }
                break;
                
            case 'verify_pan':
                if (!this.validatePAN(params.pan)) {
                    throw new Error('Invalid PAN format');
                }
                break;
                
            // Add more validations for other functions
        }
    }

    checkRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.rateLimits.get(userId) || {
            requests: [],
            blocked: false,
            blockExpiry: null
        };

        // Remove requests older than 1 hour
        userLimits.requests = userLimits.requests.filter(time => 
            now - time < 60 * 60 * 1000
        );

        // Check if user is blocked
        if (userLimits.blocked) {
            if (now < userLimits.blockExpiry) {
                throw new Error('Too many requests. Please try again later.');
            } else {
                userLimits.blocked = false;
                userLimits.requests = [];
            }
        }

        // Check rate limits
        const requestsLastMinute = userLimits.requests.filter(time => 
            now - time < 60 * 1000
        ).length;

        if (requestsLastMinute >= this.maxRequestsPerMinute) {
            userLimits.blocked = true;
            userLimits.blockExpiry = now + 5 * 60 * 1000; // Block for 5 minutes
            this.rateLimits.set(userId, userLimits);
            throw new Error('Rate limit exceeded. Please try again in 5 minutes.');
        }

        if (userLimits.requests.length >= this.maxRequestsPerHour) {
            userLimits.blocked = true;
            userLimits.blockExpiry = now + 60 * 60 * 1000; // Block for 1 hour
            this.rateLimits.set(userId, userLimits);
            throw new Error('Hourly limit exceeded. Please try again later.');
        }

        // Add current request
        userLimits.requests.push(now);
        this.rateLimits.set(userId, userLimits);
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    updateMessageStatus(messageId, status, functionName = null) {
        this.conversationContext.messageStatus = {
            lastMessageId: messageId,
            status,
            timestamp: new Date(),
            functionName
        };

        // Log status update
        logger.info('Message status updated', {
            messageId,
            status,
            functionName,
            timestamp: this.conversationContext.messageStatus.timestamp
        });
    }
}

module.exports = LoanAssistant; 