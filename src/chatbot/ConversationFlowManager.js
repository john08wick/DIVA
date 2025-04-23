const VerificationLogHandler = require('../handlers/verificationLogHandler');
const MutualFundFetchHandler = require('../handlers/mutualFundFetchHandler');
const MutualFundPledgeHandler = require('../handlers/mutualFundPledgeHandler');
const KycHandler = require('../handlers/kycHandler');
const BankAccountHandler = require('../handlers/bankAccountHandler');
const MandateHandler = require('../handlers/mandateHandler');
const AgreementHandler = require('../handlers/agreementHandler');
const LoanAccountHandler = require('../handlers/loanAccountHandler');
const logger = require('../utils/logger');

class ConversationFlowManager {
    constructor() {
        this.verificationLogHandler = new VerificationLogHandler();
        this.mutualFundFetchHandler = new MutualFundFetchHandler();
        this.mutualFundPledgeHandler = new MutualFundPledgeHandler();
        this.kycHandler = new KycHandler();
        this.bankAccountHandler = new BankAccountHandler();
        this.mandateHandler = new MandateHandler();
        this.agreementHandler = new AgreementHandler();
        this.loanAccountHandler = new LoanAccountHandler();
        
        this.resetState();
    }

    resetState() {
        this.state = {
            currentStep: 'INIT',
            opportunityId: null,
            userDetails: {
                mobile: null,
                email: null,
                pan: null
            },
            verificationLogs: {
                mobile: null,
                email: null
            },
            mutualFunds: {
                fetchOtpReferenceId: null,
                pledgeOtpReferenceId: null,
                portfolioDetails: null,
                selectedPortfolios: null,
                pledgeDetails: null
            },
            kyc: {
                referenceId: null,
                status: null,
                deviationDetails: null,
                webUrl: null
            },
            bankAccount: {
                referenceId: null,
                status: null,
                deviationDetails: null,
                details: null
            },
            mandate: {
                referenceId: null,
                status: null,
                webUrl: null
            },
            agreement: {
                referenceId: null,
                status: null
            },
            kfs: {
                referenceId: null,
                status: null
            }
        };
    }

    async processUserInput(message) {
        try {
            const response = await this.handleStep(message);
            return {
                message: response.message,
                nextStep: response.nextStep,
                data: response.data || null
            };
        } catch (error) {
            logger.error('Error processing user input', {
                error: error.message,
                step: this.state.currentStep
            });
            return {
                message: `I encountered an error: ${error.message}. Would you like to try again?`,
                nextStep: this.state.currentStep
            };
        }
    }

    async handleStep(message) {
        switch (this.state.currentStep) {
            case 'INIT':
                return this.handleInitialStep();
            
            case 'COLLECT_CONTACT':
                return this.handleContactCollection(message);
            
            case 'VERIFY_CONTACT':
                return this.handleContactVerification(message);
            
            case 'ASK_MF_CONSENT':
                return this.handleMutualFundConsent(message);
            
            case 'COLLECT_PAN':
                return this.handlePanCollection(message);
            
            case 'MF_FETCH_OTP':
                return this.handleMutualFundFetchOtp(message);
            
            case 'SHOW_MF_DETAILS':
                return this.handleMutualFundDetails(message);
            
            case 'COLLECT_PLEDGE_AMOUNT':
                return this.handlePledgeAmountCollection(message);
            
            case 'CONFIRM_PLEDGE':
                return this.handlePledgeConfirmation(message);
            
            case 'MF_PLEDGE_OTP':
                return this.handleMutualFundPledgeOtp(message);
            
            case 'ASK_KYC_CONSENT':
                return this.handleKycConsent(message);
            
            case 'INITIATE_KYC':
                return this.handleKycInitiation();
            
            case 'VERIFY_KYC':
                return this.handleKycVerification(message);
            
            case 'HANDLE_KYC_DEVIATION':
                return this.handleKycDeviation(message);
            
            case 'COLLECT_BANK_DETAILS':
                return this.handleBankDetailsCollection(message);
            
            case 'VERIFY_BANK':
                return this.handleBankVerification(message);
            
            case 'HANDLE_BANK_DEVIATION':
                return this.handleBankDeviation(message);
            
            case 'SETUP_MANDATE':
                return this.handleMandateSetup();
            
            case 'VERIFY_MANDATE':
                return this.handleMandateVerification(message);
            
            case 'SETUP_AGREEMENT':
                return this.handleAgreementSetup();
            
            case 'VERIFY_AGREEMENT':
                return this.handleAgreementVerification(message);
            
            case 'CREATE_LOAN':
                return this.handleLoanCreation();
            
            default:
                return {
                    message: "I'm not sure how to proceed. Let's start over.",
                    nextStep: 'INIT'
                };
        }
    }

    // Initial step handlers
    async handleInitialStep() {
        return {
            message: "Welcome! To get started with your loan application, I'll need your mobile number and email address. Please provide them in the format: mobile: XXXXXXXXXX, email: example@email.com",
            nextStep: 'COLLECT_CONTACT'
        };
    }

    async handleContactCollection(message) {
        try {
            const mobileMatch = message.match(/mobile:\s*(\d{10})/);
            const emailMatch = message.match(/email:\s*([^\s,]+@[^\s,]+\.[^\s,]+)/);

            if (!mobileMatch || !emailMatch) {
                return {
                    message: "I couldn't find a valid mobile number or email address. Please provide them in the format: mobile: XXXXXXXXXX, email: example@email.com",
                    nextStep: 'COLLECT_CONTACT'
                };
            }

            this.state.userDetails.mobile = mobileMatch[1];
            this.state.userDetails.email = emailMatch[1];

            // Create verification logs
            const mobileVerificationResult = await this.verificationLogHandler.createMobileVerificationLog({
                opportunityId: this.state.opportunityId,
                verificationMethod: 'OTP',
                verificationRemarks: 'Mobile verification initiated'
            });

            const emailVerificationResult = await this.verificationLogHandler.createEmailVerificationLog({
                opportunityId: this.state.opportunityId,
                verificationMethod: 'LINK',
                verificationRemarks: 'Email verification initiated'
            });

            if (mobileVerificationResult.success && emailVerificationResult.success) {
                this.state.verificationLogs.mobile = mobileVerificationResult.data.utilityReferenceId;
                this.state.verificationLogs.email = emailVerificationResult.data.utilityReferenceId;

                return {
                    message: "Great! I've sent verification codes to your mobile and email. Please check and confirm once you've verified both.",
                    nextStep: 'VERIFY_CONTACT'
                };
            }

            throw new Error('Failed to initiate contact verification');
        } catch (error) {
            logger.error('Error in contact collection', {
                error: error.message,
                mobile: this.state.userDetails.mobile,
                email: this.state.userDetails.email
            });

            return {
                message: `There was an error verifying your contact details: ${error.message}. Please try again.`,
                nextStep: 'COLLECT_CONTACT'
            };
        }
    }

    async handleContactVerification(message) {
        try {
            const mobileVerificationStatus = await this.verificationLogHandler.getVerificationLogStatus(
                this.state.verificationLogs.mobile
            );
            const emailVerificationStatus = await this.verificationLogHandler.getVerificationLogStatus(
                this.state.verificationLogs.email
            );

            if (mobileVerificationStatus.status !== 'APPROVED' || emailVerificationStatus.status !== 'APPROVED') {
                return {
                    message: "It seems your contact details haven't been verified yet. Please complete the verification process using the codes sent to your mobile and email.",
                    nextStep: 'VERIFY_CONTACT'
                };
            }

            return {
                message: "Perfect! Your contact details have been verified. Would you like to check your mutual fund portfolio for a loan against it?",
                nextStep: 'ASK_MF_CONSENT'
            };
        } catch (error) {
            logger.error('Error in contact verification', {
                error: error.message,
                mobileRef: this.state.verificationLogs.mobile,
                emailRef: this.state.verificationLogs.email
            });

            return {
                message: `There was an error verifying your contacts: ${error.message}. Please try again.`,
                nextStep: 'VERIFY_CONTACT'
            };
        }
    }

    async handleMutualFundConsent(message) {
        const positiveResponse = /^(yes|sure|okay|ok|y|yeah|yep|proceed)/i.test(message);
        const negativeResponse = /^(no|nope|n|never|not now)/i.test(message);

        if (!positiveResponse && !negativeResponse) {
            return {
                message: "I didn't quite catch that. Please let me know if you'd like to check your mutual fund portfolio (yes/no)?",
                nextStep: 'ASK_MF_CONSENT'
            };
        }

        if (positiveResponse) {
            return {
                message: "Great! To fetch your mutual fund details, I'll need your PAN number. Please provide it in the format: PAN: ABCDE1234F",
                nextStep: 'COLLECT_PAN'
            };
        }

        // If user doesn't want to proceed with mutual funds
        return {
            message: "No problem. Let's proceed with your KYC verification. Would you like to complete your KYC now?",
            nextStep: 'ASK_KYC_CONSENT'
        };
    }

    async handlePanCollection(message) {
        try {
            const panMatch = message.match(/PAN:\s*([A-Z]{5}[0-9]{4}[A-Z])/i);

            if (!panMatch) {
                return {
                    message: "I couldn't find a valid PAN number. Please provide it in the format: PAN: ABCDE1234F",
                    nextStep: 'COLLECT_PAN'
                };
            }

            this.state.userDetails.pan = panMatch[1].toUpperCase();

            // Initiate mutual fund fetch OTP
            const otpResult = await this.mutualFundFetchHandler.sendOtp({
                opportunityId: this.state.opportunityId,
                pan: this.state.userDetails.pan
            });

            if (otpResult.success) {
                this.state.mutualFunds.fetchOtpReferenceId = otpResult.data.utilityReferenceId;

                return {
                    message: "I've sent an OTP to your registered mobile number. Please enter it to view your mutual fund portfolio.",
                    nextStep: 'MF_FETCH_OTP'
                };
            }

            throw new Error('Failed to send mutual fund fetch OTP');
        } catch (error) {
            logger.error('Error in PAN collection', {
                error: error.message,
                pan: this.state.userDetails.pan
            });

            return {
                message: `There was an error processing your PAN: ${error.message}. Please try again.`,
                nextStep: 'COLLECT_PAN'
            };
        }
    }

    async handleMutualFundFetchOtp(message) {
        try {
            const otpMatch = message.match(/\d{6}/);

            if (!otpMatch) {
                return {
                    message: "Please enter a valid 6-digit OTP that was sent to your registered mobile number.",
                    nextStep: 'MF_FETCH_OTP'
                };
            }

            const otp = otpMatch[0];

            // Validate OTP and fetch portfolio
            const validationResult = await this.mutualFundFetchHandler.validateOtp({
                utilityReferenceId: this.state.mutualFunds.fetchOtpReferenceId,
                otp
            });

            if (validationResult.success) {
                const portfolioResult = await this.mutualFundFetchHandler.getPortfolioDetails(
                    this.state.mutualFunds.fetchOtpReferenceId
                );

                if (portfolioResult.success) {
                    this.state.mutualFunds.portfolioDetails = portfolioResult.data;

                    // Format portfolio details for display
                    const portfolioSummary = this.formatPortfolioDetails(portfolioResult.data);

                    return {
                        message: `Here are your mutual fund details:\n\n${portfolioSummary}\n\nHow much would you like to pledge for the loan?`,
                        nextStep: 'COLLECT_PLEDGE_AMOUNT',
                        data: portfolioResult.data
                    };
                }
            }

            throw new Error('Failed to validate OTP or fetch portfolio details');
        } catch (error) {
            logger.error('Error in MF fetch OTP validation', {
                error: error.message,
                otpRef: this.state.mutualFunds.fetchOtpReferenceId
            });

            return {
                message: `There was an error validating your OTP: ${error.message}. Please try again.`,
                nextStep: 'MF_FETCH_OTP'
            };
        }
    }

    formatPortfolioDetails(portfolioData) {
        if (!portfolioData || !portfolioData.portfolios) {
            return 'No portfolio details available';
        }

        return portfolioData.portfolios
            .map((portfolio, index) => {
                return `${index + 1}. ${portfolio.schemeName}\n` +
                       `   Units: ${portfolio.units}\n` +
                       `   Current Value: ₹${portfolio.currentValue}\n` +
                       `   Available for Pledge: ${portfolio.availableForPledge ? 'Yes' : 'No'}`;
            })
            .join('\n\n');
    }

    async handlePledgeAmountCollection(message) {
        try {
            const amountMatch = message.match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);

            if (!amountMatch) {
                return {
                    message: "Please provide a valid amount in INR that you'd like to pledge (e.g., ₹50000 or 50000).",
                    nextStep: 'COLLECT_PLEDGE_AMOUNT'
                };
            }

            const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            const totalPortfolioValue = this.calculateTotalPledgeableValue();

            if (amount <= 0) {
                return {
                    message: "The pledge amount must be greater than 0. Please provide a valid amount.",
                    nextStep: 'COLLECT_PLEDGE_AMOUNT'
                };
            }

            if (amount > totalPortfolioValue) {
                return {
                    message: `The pledge amount (₹${amount}) cannot exceed your total pledgeable portfolio value (₹${totalPortfolioValue}). Please enter a lower amount.`,
                    nextStep: 'COLLECT_PLEDGE_AMOUNT'
                };
            }

            this.state.mutualFunds.pledgeAmount = amount;

            // Initiate mutual fund pledge OTP
            const otpResult = await this.mutualFundPledgeHandler.sendOtp({
                opportunityId: this.state.opportunityId,
                pan: this.state.userDetails.pan,
                amount: amount
            });

            if (otpResult.success) {
                this.state.mutualFunds.pledgeOtpReferenceId = otpResult.data.utilityReferenceId;

                return {
                    message: `I've sent an OTP to verify your pledge request for ₹${amount}. Please enter the OTP to proceed.`,
                    nextStep: 'MF_PLEDGE_OTP'
                };
            }

            throw new Error('Failed to send mutual fund pledge OTP');
        } catch (error) {
            logger.error('Error in pledge amount collection', {
                error: error.message,
                amount: this.state.mutualFunds.pledgeAmount
            });

            return {
                message: `There was an error processing your pledge amount: ${error.message}. Please try again.`,
                nextStep: 'COLLECT_PLEDGE_AMOUNT'
            };
        }
    }

    calculateTotalPledgeableValue() {
        if (!this.state.mutualFunds.portfolioDetails || !this.state.mutualFunds.portfolioDetails.portfolios) {
            return 0;
        }

        return this.state.mutualFunds.portfolioDetails.portfolios
            .filter(portfolio => portfolio.availableForPledge)
            .reduce((total, portfolio) => total + parseFloat(portfolio.currentValue), 0);
    }

    async handleMutualFundPledgeOtp(message) {
        try {
            const otpMatch = message.match(/\d{6}/);

            if (!otpMatch) {
                return {
                    message: "Please enter a valid 6-digit OTP that was sent to your registered mobile number.",
                    nextStep: 'MF_PLEDGE_OTP'
                };
            }

            const otp = otpMatch[0];

            // Validate OTP and initiate pledge
            const validationResult = await this.mutualFundPledgeHandler.validateOtp({
                utilityReferenceId: this.state.mutualFunds.pledgeOtpReferenceId,
                otp
            });

            if (validationResult.success) {
                const pledgeResult = await this.mutualFundPledgeHandler.getPledgeDetails(
                    this.state.mutualFunds.pledgeOtpReferenceId
                );

                if (pledgeResult.success) {
                    this.state.mutualFunds.pledgeDetails = pledgeResult.data;

                    return {
                        message: `Great! Your mutual fund pledge for ₹${this.state.mutualFunds.pledgeAmount} has been initiated successfully. Let's proceed with your KYC verification. Would you like to complete your KYC now?`,
                        nextStep: 'ASK_KYC_CONSENT'
                    };
                }
            }

            throw new Error('Failed to validate OTP or complete pledge process');
        } catch (error) {
            logger.error('Error in MF pledge OTP validation', {
                error: error.message,
                otpRef: this.state.mutualFunds.pledgeOtpReferenceId
            });

            return {
                message: `There was an error validating your OTP: ${error.message}. Please try again.`,
                nextStep: 'MF_PLEDGE_OTP'
            };
        }
    }

    // Additional step handlers will be implemented in subsequent edits...
}

module.exports = ConversationFlowManager; 