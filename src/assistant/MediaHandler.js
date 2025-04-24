const axios = require('axios');
const OpenAI = require('openai');

class MediaHandler {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        this.supportedDocTypes = ['application/pdf'];
    }

    async processMedia(file, type) {
        switch (type) {
            case 'document':
                return await this.processDocument(file);
            case 'image':
                return await this.processImage(file);
            default:
                throw new Error(`Unsupported media type: ${type}`);
        }
    }

    async processDocument(file) {
        if (!this.supportedDocTypes.includes(file.mimetype)) {
            throw new Error('Unsupported document type. Please upload a PDF file.');
        }

        // Use OCR to extract text from document
        const text = await this.extractTextFromDocument(file);
        
        // Analyze the extracted text
        const analysis = await this.analyzeDocumentContent(text);

        return {
            text,
            analysis,
            validation: this.validateDocumentData(analysis)
        };
    }

    async processImage(file) {
        if (!this.supportedImageTypes.includes(file.mimetype)) {
            throw new Error('Unsupported image type. Please upload a JPEG or PNG file.');
        }

        // Check image quality
        const qualityCheck = await this.checkImageQuality(file);
        if (!qualityCheck.isAcceptable) {
            throw new Error(qualityCheck.reason);
        }

        // Extract text and information from image
        const extracted = await this.extractFromImage(file);
        
        return {
            ...extracted,
            quality: qualityCheck,
            suggestions: this.getImageImprovementSuggestions(qualityCheck)
        };
    }

    async extractTextFromDocument(file) {
        // Implement OCR for document
        // This is a placeholder - implement actual OCR logic
        return "Extracted text from document";
    }

    async analyzeDocumentContent(text) {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `Analyze the following document text and extract key information:
                ${text}
                
                Provide analysis in JSON format with the following structure:
                {
                    "documentType": "string",
                    "keyInformation": {},
                    "validationIssues": [],
                    "confidence": number
                }`
            }],
            temperature: 0.3
        });

        return JSON.parse(response.choices[0].message.content);
    }

    validateDocumentData(analysis) {
        // Implement document validation logic
        const validations = {
            isComplete: analysis.confidence > 0.8,
            missingFields: [],
            suggestions: []
        };

        if (analysis.validationIssues.length > 0) {
            validations.suggestions = this.generateValidationSuggestions(analysis.validationIssues);
        }

        return validations;
    }

    async checkImageQuality(file) {
        // Implement image quality checks
        return {
            isAcceptable: true,
            resolution: "1920x1080",
            brightness: 0.8,
            clarity: 0.9,
            reason: null
        };
    }

    async extractFromImage(file) {
        // Use OpenAI's vision model to analyze image
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [{
                role: "system",
                content: "Analyze this image and extract relevant information."
            }, {
                role: "user",
                content: [{
                    type: "image_url",
                    image_url: file.url
                }]
            }],
            max_tokens: 300
        });

        return {
            extractedText: response.choices[0].message.content,
            confidence: 0.95
        };
    }

    getImageImprovementSuggestions(qualityCheck) {
        const suggestions = [];

        if (qualityCheck.brightness < 0.6) {
            suggestions.push("Please retake the photo in better lighting");
        }
        if (qualityCheck.clarity < 0.7) {
            suggestions.push("Please ensure the image is not blurry");
        }

        return suggestions;
    }

    generateValidationSuggestions(issues) {
        return issues.map(issue => {
            switch (issue.type) {
                case 'missing_field':
                    return `Please ensure ${issue.field} is clearly visible`;
                case 'low_quality':
                    return `The ${issue.field} is not clear enough. Please retake the photo`;
                case 'invalid_format':
                    return `The ${issue.field} format is incorrect. Please check and retry`;
                default:
                    return issue.message;
            }
        });
    }

    async generateVisualExplanation(concept) {
        // Use DALL-E to generate explanatory images
        const response = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: `Create a simple, clear visual explanation of ${concept} for a loan application process.`,
            n: 1,
            size: "1024x1024"
        });

        return {
            imageUrl: response.data[0].url,
            concept,
            description: `Visual explanation of ${concept}`
        };
    }
}

module.exports = MediaHandler; 