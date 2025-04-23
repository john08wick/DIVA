const functions = [
    {
        name: "create_lead",
        description: "Create a new lead with mobile number and email",
        parameters: {
            type: "object",
            properties: {
                mobile: {
                    type: "string",
                    description: "10-digit mobile number"
                },
                email: {
                    type: "string",
                    description: "Valid email address"
                }
            },
            required: ["mobile", "email"]
        }
    },
    {
        name: "verify_pan",
        description: "Verify PAN card number",
        parameters: {
            type: "object",
            properties: {
                pan: {
                    type: "string",
                    description: "10-character PAN number"
                }
            },
            required: ["pan"]
        }
    },
    {
        name: "check_pan_status",
        description: "Check PAN verification status",
        parameters: {
            type: "object",
            properties: {
                referenceId: {
                    type: "string",
                    description: "Reference ID from verify_pan call"
                }
            },
            required: ["referenceId"]
        }
    },
    {
        name: "fetch_assets",
        description: "Fetch mutual fund assets",
        parameters: {
            type: "object",
            properties: {
                referenceId: {
                    type: "string",
                    description: "Reference ID from verify_pan call"
                }
            },
            required: ["referenceId"]
        }
    },
    {
        name: "verify_otp",
        description: "Verify OTP for fund selection",
        parameters: {
            type: "object",
            properties: {
                otp: {
                    type: "string",
                    description: "6-digit OTP"
                }
            },
            required: ["otp"]
        }
    },
    {
        name: "ocr_aadhaar",
        description: "Extract data from Aadhaar image/PDF",
        parameters: {
            type: "object",
            properties: {
                fileUrl: {
                    type: "string",
                    description: "URL of the uploaded Aadhaar file"
                }
            },
            required: ["fileUrl"]
        }
    },
    {
        name: "submit_kyc",
        description: "Submit KYC details",
        parameters: {
            type: "object",
            properties: {
                details: {
                    type: "object",
                    description: "KYC details extracted from Aadhaar"
                }
            },
            required: ["details"]
        }
    },
    {
        name: "verify_bank_account",
        description: "Verify bank account details",
        parameters: {
            type: "object",
            properties: {
                accountNumber: {
                    type: "string",
                    description: "Bank account number"
                },
                ifsc: {
                    type: "string",
                    description: "IFSC code"
                }
            },
            required: ["accountNumber", "ifsc"]
        }
    },
    {
        name: "check_bank_status",
        description: "Check bank verification status",
        parameters: {
            type: "object",
            properties: {
                referenceId: {
                    type: "string",
                    description: "Reference ID from verify_bank_account call"
                }
            },
            required: ["referenceId"]
        }
    },
    {
        name: "send_mandate_link",
        description: "Send mandate link to user",
        parameters: {
            type: "object",
            properties: {
                mobile: {
                    type: "string",
                    description: "10-digit mobile number"
                },
                email: {
                    type: "string",
                    description: "Email address"
                }
            },
            required: ["mobile", "email"]
        }
    },
    {
        name: "send_otp_fetch_mf_portfolio",
        description: "Send OTP to user's mobile number for fetching mutual fund portfolio details",
        parameters: {
            type: "object",
            properties: {
                pan: {
                    type: "string",
                    description: "10-character PAN number of the user"
                },
                mobileNumber: {
                    type: "string",
                    description: "10-digit mobile number of the user"
                },
                provider: {
                    type: "string",
                    description: "Provider for the mutual fund transaction (e.g., MFC)",
                    enum: ["MFC"]
                }
            },
            required: ["pan", "mobileNumber", "provider"]
        }
    },
    {
        name: "validate_otp_fetch_mf_portfolio",
        description: "Validate OTP for mutual fund portfolio fetch request",
        parameters: {
            type: "object",
            properties: {
                fetchRequestId: {
                    type: "string",
                    description: "Fetch request ID (FRID) received from send OTP call"
                },
                otp: {
                    type: "string",
                    description: "6-digit OTP received by user"
                }
            },
            required: ["fetchRequestId", "otp"]
        }
    },
    {
        name: "get_fetch_mf_details",
        description: "Get fetched mutual fund portfolio details",
        parameters: {
            type: "object",
            properties: {
                fetchRequestId: {
                    type: "string",
                    description: "Fetch request ID (FRID) for which to get details"
                }
            },
            required: ["fetchRequestId"]
        }
    },
    {
        name: "send_otp_pledge_mf_portfolio",
        description: "Send OTP to user to get consent for pledging mutual fund portfolio",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for the pledge request"
                },
                fenixLoanAccountId: {
                    type: "string",
                    description: "Optional Fenix loan account ID"
                },
                provider: {
                    type: "string",
                    description: "Provider for the mutual fund transaction",
                    enum: ["CAMS", "KFIN"]
                },
                mobileNumber: {
                    type: "string",
                    description: "10-digit mobile number of the user"
                },
                funds: {
                    type: "array",
                    description: "Array of funds to be pledged",
                    items: {
                        type: "object",
                        properties: {
                            isin: {
                                type: "string",
                                description: "ISIN of the mutual fund"
                            },
                            folioNumber: {
                                type: "string",
                                description: "Folio number of the mutual fund"
                            },
                            provider: {
                                type: "string",
                                description: "Provider of the mutual fund",
                                enum: ["CAMS", "KFIN"]
                            },
                            units: {
                                type: "number",
                                description: "Number of units to pledge"
                            },
                            modeOfHolding: {
                                type: "string",
                                description: "Mode of holding",
                                enum: ["SI", "JO", "AS"]
                            }
                        },
                        required: ["isin", "folioNumber", "provider", "units", "modeOfHolding"]
                    }
                }
            },
            required: ["opportunityId", "provider", "mobileNumber", "funds"]
        }
    },
    {
        name: "validate_otp_pledge_mf_portfolio",
        description: "Validate OTP for mutual fund pledge request",
        parameters: {
            type: "object",
            properties: {
                pledgeRequestId: {
                    type: "string",
                    description: "Pledge request ID (PDRID) received from send OTP call"
                },
                otp: {
                    type: "string",
                    description: "6-digit OTP received by user"
                }
            },
            required: ["pledgeRequestId", "otp"]
        }
    },
    {
        name: "get_pledged_mf_details",
        description: "Get pledged mutual fund portfolio details",
        parameters: {
            type: "object",
            properties: {
                pledgeRequestId: {
                    type: "string",
                    description: "Pledge request ID (PDRID) for which to get details"
                }
            },
            required: ["pledgeRequestId"]
        }
    },
    {
        name: "initiate_bank_verification",
        description: "Initiate bank account verification through penny drop",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for the verification request"
                },
                bankAccountNumber: {
                    type: "string",
                    description: "Bank account number to verify"
                },
                ifscCode: {
                    type: "string",
                    description: "IFSC code of the bank"
                },
                bankName: {
                    type: "string",
                    description: "Name of the bank"
                },
                bankAccountType: {
                    type: "string",
                    description: "Type of bank account",
                    enum: ["SAVINGS_ACCOUNT", "CURRENT_ACCOUNT"]
                }
            },
            required: ["opportunityId", "bankAccountNumber", "ifscCode", "bankName", "bankAccountType"]
        }
    },
    {
        name: "get_bank_verification_status",
        description: "Get the status of a bank account verification request",
        parameters: {
            type: "object",
            properties: {
                utilityReferenceId: {
                    type: "string",
                    description: "Utility reference ID received from the initiation request"
                }
            },
            required: ["utilityReferenceId"]
        }
    },
    {
        name: "initiate_mutual_fund_pledge",
        description: "Initiate mutual fund pledge process by sending OTP",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for the pledge request"
                },
                pan: {
                    type: "string",
                    description: "PAN number of the user"
                },
                amount: {
                    type: "number",
                    description: "Amount to be pledged"
                }
            },
            required: ["opportunityId", "pan", "amount"]
        }
    },
    {
        name: "validate_mutual_fund_pledge_otp",
        description: "Validate OTP for mutual fund pledge",
        parameters: {
            type: "object",
            properties: {
                utilityReferenceId: {
                    type: "string",
                    description: "Reference ID received from pledge initiation"
                },
                otp: {
                    type: "string",
                    description: "6-digit OTP received by user"
                }
            },
            required: ["utilityReferenceId", "otp"]
        }
    },
    {
        name: "initiate_kyc",
        description: "Initiate KYC verification process",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for KYC verification"
                },
                redirectUrl: {
                    type: "string",
                    description: "URL to redirect after KYC completion"
                }
            },
            required: ["opportunityId"]
        }
    },
    {
        name: "get_kyc_status",
        description: "Check KYC verification status",
        parameters: {
            type: "object",
            properties: {
                utilityReferenceId: {
                    type: "string",
                    description: "Reference ID from KYC initiation"
                }
            },
            required: ["utilityReferenceId"]
        }
    },
    {
        name: "handle_kyc_deviation",
        description: "Handle KYC deviation by submitting additional documents",
        parameters: {
            type: "object",
            properties: {
                utilityReferenceId: {
                    type: "string",
                    description: "Reference ID from KYC initiation"
                },
                documents: {
                    type: "array",
                    description: "Array of documents to be submitted",
                    items: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                description: "Type of document"
                            },
                            fileUrl: {
                                type: "string",
                                description: "URL of the uploaded document"
                            }
                        }
                    }
                }
            },
            required: ["utilityReferenceId", "documents"]
        }
    },
    {
        name: "setup_mandate",
        description: "Setup mandate for loan repayment",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for mandate setup"
                },
                bankAccountVerificationId: {
                    type: "string",
                    description: "Bank account verification reference ID"
                },
                endDate: {
                    type: "string",
                    description: "End date for the mandate (YYYY-MM-DD)"
                },
                mandateType: {
                    type: "string",
                    description: "Type of mandate",
                    enum: ["NACH", "E_MANDATE"]
                },
                mandateAmount: {
                    type: "number",
                    description: "Amount for the mandate"
                },
                redirectionUrl: {
                    type: "string",
                    description: "URL to redirect after mandate setup"
                }
            },
            required: ["opportunityId", "bankAccountVerificationId", "mandateAmount"]
        }
    },
    {
        name: "get_mandate_status",
        description: "Check mandate setup status",
        parameters: {
            type: "object",
            properties: {
                utilityReferenceId: {
                    type: "string",
                    description: "Reference ID from mandate setup"
                }
            },
            required: ["utilityReferenceId"]
        }
    },
    {
        name: "setup_agreement_and_kfs",
        description: "Setup loan agreement and KFS",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for agreement and KFS setup"
                },
                redirectionUrl: {
                    type: "string",
                    description: "URL to redirect after agreement and KFS setup"
                }
            },
            required: ["opportunityId"]
        }
    },
    {
        name: "create_loan_account",
        description: "Create loan account after all verifications",
        parameters: {
            type: "object",
            properties: {
                opportunityId: {
                    type: "string",
                    description: "Opportunity ID for loan account creation"
                }
            },
            required: ["opportunityId"]
        }
    }
];

const mandateFunctions = [
    {
        name: 'initiateMandateSetup',
        description: 'Initiate the setup of an e-NACH mandate for collecting interest payments. Returns a web URL where the user can complete the setup.',
        parameters: {
            type: 'object',
            properties: {
                opportunityId: {
                    type: 'string',
                    description: 'Identifier for the opportunity'
                },
                bankAccountVerificationId: {
                    type: 'string',
                    description: 'Identifier for bank account verification'
                },
                endDate: {
                    type: 'string',
                    description: 'End date of the mandate (YYYY-MM-DD format, must be between 5 and 40 years from now)'
                },
                mandateType: {
                    type: 'string',
                    enum: ['API_MANDATE', 'PHYSICAL_MANDATE', 'UPI_MANDATE', 'ESIGN_MANDATE'],
                    description: 'Type of mandate'
                },
                mandateAmount: {
                    type: 'string',
                    description: 'Amount for the mandate (must be positive and not exceed 1 crore)'
                },
                redirectionUrl: {
                    type: 'string',
                    description: 'URL to redirect after mandate setup (must start with https://)',
                    default: 'https://www.voltmoney.in'
                }
            },
            required: ['opportunityId', 'bankAccountVerificationId', 'endDate', 'mandateType', 'mandateAmount']
        }
    },
    {
        name: 'getMandateStatus',
        description: 'Check the status of a mandate setup process. Use this after the user confirms they have completed the setup through the web URL.',
        parameters: {
            type: 'object',
            properties: {
                utilityReferenceId: {
                    type: 'string',
                    description: 'Utility reference ID received from mandate setup'
                }
            },
            required: ['utilityReferenceId']
        }
    }
];

module.exports = {
    functions,
    mandateFunctions
};

if (typeof module.exports.getAllFunctions === 'function') {
    const originalGetAllFunctions = module.exports.getAllFunctions;
    module.exports.getAllFunctions = () => {
        const existingFunctions = originalGetAllFunctions();
        return [...existingFunctions, ...mandateFunctions];
    };
} 