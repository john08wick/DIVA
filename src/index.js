require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const LoanAssistant = require('./assistant/LoanAssistant');
const LoanAPI = require('./api/loanApi');
const KycAPI = require('./api/kycApi');
const BankVerificationAPI = require('./api/bankVerificationApi');
const MutualFundFetchAPI = require('./api/mutualFundFetchApi');
const MutualFundPledgeAPI = require('./api/mutualFundPledgeApi');
const MandateAPI = require('./api/mandateApi');
const AgreementAPI = require('./api/agreementApi');
const KfsApi = require('./api/kfsApi');
const VerificationLogApi = require('./api/verificationLogApi');
const OpportunityApi = require('./api/opportunityApi');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS with specific configuration
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-SourcingChannelCode',
        'X-Signature',
        'X-Timestamp',
        'Accept'
    ],
    credentials: true,
    maxAge: 86400  // 24 hours
}));

// Initialize the loan assistant
const assistant = new LoanAssistant();
const loanApi = new LoanAPI();
const kycApi = new KycAPI();
const bankVerificationApi = new BankVerificationAPI();
const mutualFundFetchApi = new MutualFundFetchAPI();
const mutualFundPledgeApi = new MutualFundPledgeAPI();
const mandateApi = new MandateAPI();
const agreementApi = new AgreementAPI();
const kfsApi = new KfsApi();
const verificationLogApi = new VerificationLogApi();
const opportunityApi = new OpportunityApi();
assistant.initialize().catch(console.error);

app.use(bodyParser.json());

// Endpoint to handle chat messages
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await assistant.handleMessage(message);
        res.json({ response });
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// File upload endpoint for Aadhaar
app.post('/upload-aadhaar', async (req, res) => {
    // Implement file upload logic here
    // This should handle the file upload and return a URL that can be used with ocr_aadhaar
    res.json({ fileUrl: 'https://example.com/uploads/aadhaar.pdf' });
});

// Add the lead endpoint
app.post('/lead', async (req, res) => {
    try {
        const { mobile, email } = req.body;
        
        // Validate mobile number
        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mobile number. Must be 10 digits.'
            });
        }

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format.'
            });
        }

        const response = await loanApi.createLead(mobile, email);
        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// PAN verification endpoint
app.post('/verify-pan', async (req, res) => {
    try {
        const { pan } = req.body;
        
        // Validate PAN format (5 letters + 4 numbers + 1 letter)
        if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PAN format. Must be in format: ABCDE1234F'
            });
        }

        const response = await loanApi.verifyPan(pan);
        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error verifying PAN:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});


app.post('/kyc/initiate', async (req, res) => {
    try {
        const response = await kycApi.initiateKyc(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/kyc/status/:utilityReferenceId', async (req, res) => {
    try {
        const response = await kycApi.getKycStatus(req.params.utilityReferenceId);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/kyc/deviation', async (req, res) => {
    try {
        const response = await kycApi.submitDeviation(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Bank Verification APIs
app.post('/bank/verify', async (req, res) => {
    try {
        const response = await bankVerificationApi.initiateBankVerification(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/bank/status/:utilityReferenceId', async (req, res) => {
    try {
        const response = await bankVerificationApi.getBankVerificationStatus(req.params.utilityReferenceId);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Mutual Fund Fetch APIs
app.post('/mf/send-otp', async (req, res) => {
    try {
        const response = await mutualFundFetchApi.sendOTPForMFPortfolio(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        console.error('Error sending OTP for MF portfolio: Ankurr', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/mf/validate-otp', async (req, res) => {
    try {
        const { fetchRequestId, otp } = req.body;
        const response = await mutualFundFetchApi.validateOTPForMFPortfolio(fetchRequestId, otp);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/mf/portfolio/:fetchRequestId', async (req, res) => {
    try {
        const response = await mutualFundFetchApi.getMFPortfolioDetails(req.params.fetchRequestId);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Mutual Fund Pledge APIs
app.post('/mf/pledge/send-otp', async (req, res) => {
    try {
        const response = await mutualFundPledgeApi.sendOTPForPledge(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/mf/pledge/validate-otp', async (req, res) => {
    try {
        const { utilityReferenceId, otp } = req.body;
        const response = await mutualFundPledgeApi.validateOTP(utilityReferenceId, otp);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/mf/pledge/:pledgeRequestId', async (req, res) => {
    try {
        const response = await mutualFundPledgeApi.getPledgeDetails(req.params.pledgeRequestId);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. Mandate APIs
app.post('/mandate/setup', async (req, res) => {
    try {
        const response = await mandateApi.initiateMandateSetup(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/mandate/status/:utilityReferenceId', async (req, res) => {
    try {
        const response = await mandateApi.getMandateStatus(req.params.utilityReferenceId);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 9. Agreement APIs
app.post('/agreement/initiate', async (req, res) => {
    try {
        const response = await agreementApi.initiateAgreement(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/opportunity/create', async (req, res) => {
    try {
        const response = await opportunityApi.createOpportunity(req.body);
        res.json({ success: true, data: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Loan application assistant listening on port ${port}`);
}); 