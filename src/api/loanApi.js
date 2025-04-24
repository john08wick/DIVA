const axios = require('axios');
const apiClient = require('../utils/apiClient');

class LoanAPI {
    constructor(baseURL) {
        this.api = axios.create({
            baseURL: baseURL || process.env.API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY}`
            }
        });
    }

    async createLead(mobile, email) {
        try {
            console.log("Creating lead with mobile:", mobile, "and email:", email);
            const response = await apiClient.post('/lead', { mobile, email });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create lead: ${error.message}`);
        }
    }

    async verifyPan(pan) {
        try {
            const response = await this.api.post('/verify-pan', { pan });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to verify PAN: ${error.message}`);
        }
    }

    async checkPanStatus(referenceId) {
        try {
            const response = await this.api.get(`/pan-status/${referenceId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to check PAN status: ${error.message}`);
        }
    }

    async fetchAssets(referenceId) {
        try {
            const response = await this.api.get(`/assets/${referenceId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch assets: ${error.message}`);
        }
    }

    async verifyOtp(otp) {
        try {
            const response = await this.api.post('/verify-otp', { otp });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to verify OTP: ${error.message}`);
        }
    }

    async ocrAadhaar(fileUrl) {
        try {
            const response = await this.api.post('/ocr-aadhaar', { fileUrl });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to process Aadhaar: ${error.message}`);
        }
    }

    async submitKyc(details) {
        try {
            const response = await this.api.post('/submit-kyc', details);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to submit KYC: ${error.message}`);
        }
    }

    async verifyBankAccount(accountNumber, ifsc) {
        try {
            const response = await this.api.post('/verify-bank', { accountNumber, ifsc });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to verify bank account: ${error.message}`);
        }
    }

    async checkBankStatus(referenceId) {
        try {
            const response = await this.api.get(`/bank-status/${referenceId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to check bank status: ${error.message}`);
        }
    }

    async sendMandateLink(mobile, email) {
        try {
            const response = await this.api.post('/send-mandate', { mobile, email });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to send mandate link: ${error.message}`);
        }
    }
}

module.exports = LoanAPI; 