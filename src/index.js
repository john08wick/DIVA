require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const LoanAssistant = require('./assistant/LoanAssistant');

const app = express();
const port = process.env.PORT || 3000;

// Initialize the loan assistant
const assistant = new LoanAssistant();
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

app.listen(port, () => {
    console.log(`Loan application assistant listening on port ${port}`);
}); 