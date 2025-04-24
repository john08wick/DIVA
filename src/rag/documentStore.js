const { Document } = require('langchain/document');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');

class DocumentStore {
    constructor() {
        this.vectorStore = null;
        console.log(" 2222", process.env.OPENAI_API_KEY);
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY
        });
    }

    async initialize() {
        // Sample documents - in production, these would be loaded from a database or files
        const documents = [
            new Document({
                pageContent: "A mandate is an authorization given by you to automatically debit your bank account for loan EMI payments. It's a one-time setup that ensures timely payments without manual intervention.",
                metadata: { source: "mandate_faq.md" }
            }),
            new Document({
                pageContent: "KYC (Know Your Customer) verification typically takes 2-3 business days. This includes verification of your PAN card, Aadhaar details, and bank account information.",
                metadata: { source: "kyc_faq.md" }
            }),
            new Document({
                pageContent: "The loan application process involves verifying your identity through PAN and Aadhaar, checking your mutual fund assets, and setting up a bank mandate for EMI payments.",
                metadata: { source: "process_overview.md" }
            }),
            // Add more documents as needed
        ];

        this.vectorStore = await MemoryVectorStore.fromDocuments(
            documents,
            this.embeddings
        );
    }

    async searchDocuments(query, k = 1) {
        if (!this.vectorStore) {
            throw new Error('Document store not initialized');
        }

        const results = await this.vectorStore.similaritySearch(query, k);
        return results;
    }
}

module.exports = DocumentStore; 