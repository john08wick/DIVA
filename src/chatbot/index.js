const OpenAI = require('openai');
const functions = require('../openai/functions');
const mutualFundPledgeHandler = require('../handlers/mutualFundPledgeHandler');
const bankVerificationHandler = require('../handlers/bankVerificationHandler');
const api = require('../utils/apiClient');
const MandateHandler = require('../handlers/mandateHandler');

class Chatbot {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
        }

        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.conversationHistory = [];
        this.mandateHandler = new MandateHandler();
    }

    /**
     * Process user message and generate response
     * @param {string} userMessage User's message
     * @returns {Promise<string>} Chatbot's response
     */
    async processMessage(userMessage) {
        try {
            console.log('\nProcessing message:', userMessage);
            
            // Add user message to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });

            // Get OpenAI response
            console.log('Calling OpenAI API...');
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: this.conversationHistory,
                functions: functions,
                function_call: 'auto'
            });

            const response = completion.choices[0];
            console.log('OpenAI Response:', JSON.stringify(response.message, null, 2));

            // Handle function calls if present
            if (response.message.function_call) {
                console.log('Function call detected:', response.message.function_call.name);
                const functionResponse = await this.handleFunctionCall(response.message.function_call);
                console.log('Function response:', JSON.stringify(functionResponse, null, 2));
                
                // Add function call and result to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: null,
                    function_call: response.message.function_call
                });
                this.conversationHistory.push({
                    role: 'function',
                    name: response.message.function_call.name,
                    content: JSON.stringify(functionResponse)
                });

                // Get final response from OpenAI
                console.log('Getting final response from OpenAI...');
                const finalCompletion = await this.openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: this.conversationHistory
                });

                const finalResponse = finalCompletion.choices[0].message.content;
                console.log('Final response:', finalResponse);
                
                this.conversationHistory.push({
                    role: 'assistant',
                    content: finalResponse
                });

                return finalResponse;
            }

            // Add assistant's response to conversation history
            this.conversationHistory.push(response.message);

            return response.message.content;
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                return "I apologize, but I'm having trouble accessing the bank verification service due to authentication issues. Please ensure the system is properly configured with valid credentials.";
            } else if (error instanceof api.ApiError) {
                switch (error.status) {
                    case 404:
                        return "I apologize, but the bank verification service is currently unavailable. Please try again later.";
                    case 429:
                        return "I apologize, but we've hit the rate limit for bank verifications. Please wait a moment and try again.";
                    default:
                        return `I apologize, but there was an error with the bank verification service: ${error.message}`;
                }
            }
            console.error('Error processing message:', error);
            return "I apologize, but I encountered an error while processing your request. Please try again later.";
        }
    }

    /**
     * Handle OpenAI function calls
     * @param {Object} functionCall Function call details from OpenAI
     * @returns {Promise<Object>} Function response
     */
    async handleFunctionCall(functionCall) {
        console.log('Function call detected:', functionCall.name);
        
        try {
            const { name, arguments: args } = functionCall;

            switch (name) {
                case 'send_otp_pledge_mf_portfolio':
                    return await mutualFundPledgeHandler.handleSendOTPPledge(JSON.parse(args));

                case 'validate_otp_pledge_mf_portfolio':
                    return await mutualFundPledgeHandler.handleValidateOTPPledge(JSON.parse(args));

                case 'get_pledged_mf_details':
                    return await mutualFundPledgeHandler.handleGetPledgeDetails(JSON.parse(args));

                case 'initiate_bank_verification':
                    return await this.initiateBankVerification(JSON.parse(args));

                case 'get_bank_verification_status':
                    return await this.getBankVerificationStatus(JSON.parse(args));

                case 'initiateMandateSetup':
                    return await this.handleMandateSetup(args);

                case 'getMandateStatus':
                    return await this.handleMandateStatus(args.utilityReferenceId);

                case 'registerMandate':
                    return await this.handleMandateRegistration(args.opportunityId, args);

                default:
                    throw new Error(`Unknown function: ${name}`);
            }
        } catch (error) {
            if (error instanceof api.AuthenticationError) {
                return {
                    success: false,
                    message: "Error initiating bank verification: Authentication failed. Please ensure the system is properly configured.",
                    error: error
                };
            } else if (error instanceof api.ApiError) {
                return {
                    success: false,
                    message: `Error with bank verification service: ${error.message}`,
                    error: error
                };
            }
            return {
                success: false,
                message: `Error processing request: ${error.message}`,
                error: error
            };
        }
    }

    async initiateBankVerification(params) {
        try {
            const response = await api.post('/utility/bank/verification/init', params);
            return {
                success: true,
                message: "Bank verification initiated successfully",
                data: response
            };
        } catch (error) {
            throw error; // Let the error handler in handleFunctionCall handle it
        }
    }

    async getBankVerificationStatus(params) {
        try {
            const { utilityReferenceId } = params;
            const response = await api.get(`/utility/bank/verification/${utilityReferenceId}`);
            return {
                success: true,
                message: "Retrieved bank verification status successfully",
                data: response
            };
        } catch (error) {
            throw error; // Let the error handler in handleFunctionCall handle it
        }
    }

    async handleMandateSetup(params) {
        try {
            const result = await this.mandateHandler.initiateMandateSetup(params);
            if (result.success) {
                const { utilityReferenceId, webUrl } = result.data;
                
                if (!webUrl) {
                    return {
                        success: false,
                        message: 'Failed to generate mandate setup URL. Please try again.'
                    };
                }

                return {
                    success: true,
                    message: `Please complete your mandate setup by visiting this link:\n${webUrl}\n\nOnce you've completed the setup, let me know and I'll check the status for you.`,
                    utilityReferenceId,
                    webUrl
                };
            }
            return {
                success: false,
                message: `Failed to initiate mandate setup: ${result.message}`
            };
        } catch (error) {
            logger.error('Error in handleMandateSetup', { error });
            return {
                success: false,
                message: 'An error occurred while setting up the mandate. Please try again.'
            };
        }
    }

    async handleMandateStatus(utilityReferenceId) {
        try {
            const result = await this.mandateHandler.getMandateStatus(utilityReferenceId);
            if (result.success) {
                const { status, subStatus, bankAccountDetails } = result.data;
                const statusDescription = this.mandateHandler.getStatusDescription(status, subStatus);
                
                let response = `Mandate Status: ${statusDescription}\n`;
                
                if (status === 'APPROVED' && subStatus === 'MANDATE_SUCCESS') {
                    response += '\n✅ Your mandate setup has been completed successfully!';
                } else if (status === 'IN_PROGRESS') {
                    response += '\n⏳ Your mandate setup is still in progress. Please complete the process using the provided link.';
                } else if (status === 'REJECTED' || status === 'FAILED') {
                    response += '\n❌ There was an issue with your mandate setup. You may need to try again.';
                }

                if (bankAccountDetails) {
                    response += `\n\nBank Account Details:\n`;
                    response += `Account Holder: ${bankAccountDetails.nameAsPerBankAccount}\n`;
                    response += `Account Number: ${bankAccountDetails.accountNumber}\n`;
                    response += `Bank: ${bankAccountDetails.bankName}\n`;
                    response += `IFSC: ${bankAccountDetails.ifscCode}`;
                }
                
                return {
                    success: true,
                    message: response,
                    status,
                    subStatus,
                    isComplete: status === 'APPROVED' && subStatus === 'MANDATE_SUCCESS'
                };
            }
            return {
                success: false,
                message: `Failed to get mandate status: ${result.message}`
            };
        } catch (error) {
            logger.error('Error in handleMandateStatus', { error });
            return {
                success: false,
                message: 'An error occurred while checking mandate status. Please try again.'
            };
        }
    }

    async handleMandateRegistration(opportunityId, params) {
        try {
            const result = await this.mandateHandler.registerMandate(opportunityId, params);
            if (result.success) {
                const { utilityReferenceId, status, subStatus } = result.data;
                const statusDescription = this.mandateHandler.getStatusDescription(status, subStatus);
                
                return {
                    message: `Mandate registered successfully.\nStatus: ${statusDescription}`,
                    utilityReferenceId,
                    status,
                    subStatus
                };
            }
            return {
                message: `Failed to register mandate: ${result.message}`
            };
        } catch (error) {
            logger.error('Error in handleMandateRegistration', { error });
            return {
                message: 'An error occurred while registering the mandate. Please try again.'
            };
        }
    }

    /**
     * Clear conversation history
     */
    clearConversation() {
        this.conversationHistory = [];
    }
}

module.exports = new Chatbot(); 