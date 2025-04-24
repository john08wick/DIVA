const apiClient = require('../utils/apiClient');
const config = require('../config/apiConfig');

class OpportunityAPI {
    constructor() {
        this.endpoints = config.endpoints.opportunity;
    }

    async createOpportunity(data) {
            const response = await apiClient.post(this.endpoints.create, data);
            return response;
        
    }
}

module.exports = OpportunityAPI;