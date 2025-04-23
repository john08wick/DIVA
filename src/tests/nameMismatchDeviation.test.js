const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.test')
});
const DeviationHandler = require('../handlers/deviationHandler');

// Test data
const TEST_DATA = {
    opportunityId: 'OPP' + Math.floor(Math.random() * 10000000000),
    utilityReferenceId: 'URPHV' + Math.floor(Math.random() * 10000000000),
    documentType: 'PASSPORT',
    base64DocumentFront: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // Truncated for brevity
    nameInDocument: 'John K. Smith',
    nameInRecord: 'John Kumar Smith',
    deviationReason: 'NAME_MISMATCH',
    remarks: 'Initial K. vs full name Kumar'
};

async function testNameMismatchDeviation() {
    try {
        console.log('Starting Name Mismatch Deviation test...');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('API Base URL:', process.env.API_BASE_URL);
        
        const deviationHandler = new DeviationHandler();

        // Test Case 1: Initial vs Full Name
        console.log('\n1. Testing Initial vs Full Name mismatch...');
        const initialVsFullResult = await deviationHandler.handleNameMismatchDeviation(TEST_DATA);
        console.log('Initial vs Full Name Result:', JSON.stringify(initialVsFullResult, null, 2));

        // Test Case 2: Case Mismatch
        console.log('\n2. Testing Case Mismatch...');
        const caseMismatchResult = await deviationHandler.handleNameMismatchDeviation({
            ...TEST_DATA,
            nameInDocument: 'JOHN KUMAR SMITH',
            nameInRecord: 'John Kumar Smith',
            remarks: 'Case difference in name'
        });
        console.log('Case Mismatch Result:', JSON.stringify(caseMismatchResult, null, 2));

        // Test Case 3: Spelling Variation
        console.log('\n3. Testing Spelling Variation...');
        const spellingVariationResult = await deviationHandler.handleNameMismatchDeviation({
            ...TEST_DATA,
            nameInDocument: 'Jon Kumar Smyth',
            nameInRecord: 'John Kumar Smith',
            remarks: 'Spelling variations in first and last name'
        });
        console.log('Spelling Variation Result:', JSON.stringify(spellingVariationResult, null, 2));

        // Test Case 4: Complete Mismatch
        console.log('\n4. Testing Complete Mismatch...');
        const completeMismatchResult = await deviationHandler.handleNameMismatchDeviation({
            ...TEST_DATA,
            nameInDocument: 'Robert Williams',
            nameInRecord: 'John Kumar Smith',
            remarks: 'Completely different names'
        });
        console.log('Complete Mismatch Result:', JSON.stringify(completeMismatchResult, null, 2));

        // Test Case 5: Bank Document Name Mismatch
        console.log('\n5. Testing Bank Document Name Mismatch...');
        const bankDocumentResult = await deviationHandler.handleNameMismatchDeviation({
            ...TEST_DATA,
            documentType: 'BANK_STATEMENT',
            nameInDocument: 'J K Smith',
            nameInRecord: 'John Kumar Smith',
            remarks: 'Initials in bank statement'
        });
        console.log('Bank Document Result:', JSON.stringify(bankDocumentResult, null, 2));

        console.log('\nName Mismatch Deviation tests completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('\nTest failed:', error.message);
        if (error.response?.data) {
            console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

// Run the test
testNameMismatchDeviation(); 