"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMMFollowsService = void 0;
const db_service_1 = require("./db.service");
const env_1 = require("../config/env");
class SMMFollowsService {
    static instance;
    db;
    constructor() {
        this.db = db_service_1.DatabaseService.getInstance();
    }
    static getInstance() {
        if (!SMMFollowsService.instance) {
            SMMFollowsService.instance = new SMMFollowsService();
        }
        return SMMFollowsService.instance;
    }
    getCredentials() {
        const customKey = this.db.getSettingValue('smmfollows_api_key');
        const customUrl = this.db.getSettingValue('smmfollows_api_url');
        return {
            apiKey: customKey || env_1.ENV.SMMFOLLOWS_API_KEY,
            apiUrl: customUrl || env_1.ENV.SMMFOLLOWS_API_URL,
        };
    }
    /**
     * Helper to make authenticated POST requests to SMMFollows API
     */
    async request(action, extraParams = {}) {
        const { apiKey, apiUrl } = this.getCredentials();
        if (!apiKey) {
            throw new Error('Provider API key is not configured');
        }
        const payload = {
            key: apiKey,
            action,
            ...extraParams,
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'DigitalSMM-Engine/1.0',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Provider HTTP error ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Provider request timed out after 15s');
            }
            throw err;
        }
    }
    /**
     * Check Provider Account Balance
     */
    async getBalance() {
        try {
            const data = await this.request('balance');
            if (data.error) {
                throw new Error(data.error);
            }
            return {
                balance: data.balance || '0.00',
                currency: data.currency || 'USD',
                rawResponse: data,
            };
        }
        catch (err) {
            console.error('Failed to fetch SMMFollows balance:', err.message);
            throw err;
        }
    }
    /**
     * Fetch complete services catalog from SMMFollows
     */
    async getServices() {
        try {
            const data = await this.request('services');
            if (Array.isArray(data)) {
                return data;
            }
            if (data && data.error) {
                throw new Error(data.error);
            }
            return [];
        }
        catch (err) {
            console.error('Failed to fetch SMMFollows services:', err.message);
            throw err;
        }
    }
    /**
     * Place an order on SMMFollows
     */
    async addOrder(params) {
        try {
            const response = await this.request('add', {
                service: params.service,
                link: params.link,
                quantity: params.quantity,
                ...(params.runs ? { runs: params.runs } : {}),
                ...(params.interval ? { interval: params.interval } : {}),
                ...(params.comments ? { comments: params.comments } : {}),
            });
            if (response && response.order) {
                return {
                    order: response.order,
                    raw: response,
                };
            }
            if (response && response.error) {
                return {
                    error: response.error,
                    raw: response,
                };
            }
            return {
                error: 'Unexpected response from upstream gateway',
                raw: response,
            };
        }
        catch (err) {
            return {
                error: err.message || 'Provider connection error',
            };
        }
    }
    /**
     * Check status of a single order
     */
    async getOrderStatus(orderId) {
        try {
            const data = await this.request('status', { order: orderId });
            return data;
        }
        catch (err) {
            return {
                error: err.message,
            };
        }
    }
    /**
     * Check status of multiple orders (comma-separated IDs)
     */
    async getMultipleOrdersStatus(orderIds) {
        try {
            const data = await this.request('status', { orders: orderIds.join(',') });
            return data;
        }
        catch (err) {
            console.error('Failed to fetch multi-order status:', err.message);
            return {};
        }
    }
}
exports.SMMFollowsService = SMMFollowsService;
