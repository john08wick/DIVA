# Digital Intelligent Virtual Assistant(DIVA)

A conversational AI assistant that helps users complete their loan application process using OpenAI's function calling and RAG (Retrieval-Augmented Generation).

## Features

- Step-by-step loan application process
- Conversational interface using OpenAI GPT-4
- Document retrieval for answering general questions
- Automated verification of PAN, Aadhaar, and bank details
- Mandate link generation and tracking

## Prerequisites

- Node.js 16+
- OpenAI API key
- Backend API endpoints for loan processing

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   API_BASE_URL=your_backend_api_url
   API_KEY=your_backend_api_key
   PORT=3000
   ```

## Running the Application

Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000 (or the port specified in your .env file).

## API Endpoints

### POST /chat
Send a message to the assistant:
```json
{
    "message": "Hi, I want to apply for a loan"
}
```

### POST /upload-aadhaar
Upload Aadhaar document:
```
multipart/form-data
file: <aadhaar_file>
```

## Onboarding Flow

1. Get user's mobile number and email
2. Verify PAN card
3. Check mutual fund assets
4. Verify OTP
5. Process Aadhaar document
6. Verify bank account
7. Send mandate link

## RAG System

The assistant can answer general questions about:
- Loan application process
- KYC requirements
- Mandate setup
- Verification timelines

## Development

### Project Structure

```
src/
  ├── api/
  │   └── loanApi.js
  ├── assistant/
  │   └── LoanAssistant.js
  ├── openai/
  │   └── functions.js
  ├── rag/
  │   └── documentStore.js
  └── index.js
```

### Adding New Features

1. Define new functions in `src/openai/functions.js`
2. Implement API calls in `src/api/loanApi.js`
3. Add context handling in `src/assistant/LoanAssistant.js`
4. Update RAG documents as needed

## License

MIT 
