"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderService = void 0;
const db_service_1 = require("./db.service");
const env_1 = require("../config/env");
const encryption_service_1 = require("./encryption.service");
class ProviderService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }
    /**
     * Helper to normalize API URL (e.g. https://smmpwr.com/api -> https://smmpwr.com/api/v2)
     */
    normalizeApiUrl(url) {
        if (!url)
            return '';
        let cleaned = url.trim().replace(/\/+$/, '');
        if (cleaned.endsWith('/api')) {
            cleaned = `${cleaned}/v2`;
        }
        return cleaned;
    }
    /**
     * Retrieve active credentials for a given provider
     */
    getCredentials(providerId) {
        const db = db_service_1.DatabaseService.getInstance();
        const pid = (providerId || 'smmfollows').toLowerCase().trim();
        const provider = db.getProviderById(pid);
        if (provider) {
            // In case key is encrypted
            const apiKey = provider.apiKey.includes(':')
                ? encryption_service_1.EncryptionService.decryptFromString(provider.apiKey) || provider.apiKey
                : provider.apiKey;
            return {
                id: provider.id,
                name: provider.name,
                apiKey: apiKey || '',
                apiUrl: this.normalizeApiUrl(provider.apiUrl),
            };
        }
        // Fallback for default smmfollows
        const customKey = db.getSettingValue('smmfollows_api_key');
        const customUrl = db.getSettingValue('smmfollows_api_url');
        return {
            id: 'smmfollows',
            name: 'SMMFollows',
            apiKey: customKey || env_1.ENV.SMMFOLLOWS_API_KEY,
            apiUrl: this.normalizeApiUrl(customUrl || env_1.ENV.SMMFOLLOWS_API_URL),
        };
    }
    /**
     * Universal authenticated POST request to SMM panel APIs
     * Uses application/x-www-form-urlencoded for maximum compatibility across all SMM platforms
     */
    async request(providerId, action, extraParams = {}) {
        const { apiKey, apiUrl, name } = this.getCredentials(providerId);
        if (!apiKey) {
            throw new Error(`Provider API key for "${name || providerId}" is not configured`);
        }
        if (!apiUrl) {
            throw new Error(`Provider API URL for "${name || providerId}" is not configured`);
        }
        const formParams = new URLSearchParams();
        formParams.append('key', apiKey);
        formParams.append('action', action);
        for (const [k, v] of Object.entries(extraParams)) {
            if (v !== undefined && v !== null) {
                formParams.append(k, String(v));
            }
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'DigitalSMM-Engine/1.0',
                },
                body: formParams.toString(),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Provider HTTP error ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            }
            catch (parseErr) {
                throw new Error(`Invalid JSON received from provider: ${text.slice(0, 100)}`);
            }
            return data;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error(`Provider request to "${name}" timed out after 20s`);
            }
            throw err;
        }
    }
    /**
     * Check Provider Account Balance
     */
    async getBalance(providerId) {
        try {
            const data = await this.request(providerId, 'balance');
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
            console.error(`Failed to fetch ${providerId || 'provider'} balance:`, err.message);
            throw err;
        }
    }
    /**
     * Fetch complete raw services catalog from provider
     */
    async getServices(providerId) {
        try {
            const data = await this.request(providerId, 'services');
            if (Array.isArray(data)) {
                return data;
            }
            if (data && data.error) {
                throw new Error(data.error);
            }
            return [];
        }
        catch (err) {
            console.error(`Failed to fetch services from ${providerId || 'provider'}:`, err.message);
            throw err;
        }
    }
    /**
     * Place an order on provider
     */
    async addOrder(providerId, params) {
        try {
            const response = await this.request(providerId, 'add', {
                service: params.service,
                link: params.link,
                quantity: params.quantity,
                ...(params.runs ? { runs: params.runs } : {}),
                ...(params.interval ? { interval: params.interval } : {}),
                ...(params.comments ? { comments: params.comments } : {}),
            });
            if (response && response.order) {
                return {
                    order: Number(response.order),
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
    async getOrderStatus(providerId, orderId) {
        try {
            const data = await this.request(providerId, 'status', { order: orderId });
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
    async getMultipleOrdersStatus(providerId, orderIds) {
        try {
            const data = await this.request(providerId, 'status', { orders: orderIds.join(',') });
            return data || {};
        }
        catch (err) {
            console.error(`Failed to fetch multi-order status from ${providerId}:`, err.message);
            return {};
        }
    }
    /**
     * Request refill for an order on provider
     */
    async refillOrder(providerId, orderId) {
        try {
            const data = await this.request(providerId, 'refill', { order: orderId });
            return data;
        }
        catch (err) {
            return { error: err.message };
        }
    }
    /**
     * Request cancellation for orders on provider
     */
    async cancelOrders(providerId, orderIds) {
        try {
            const data = await this.request(providerId, 'cancel', { orders: orderIds.join(',') });
            return data;
        }
        catch (err) {
            return { error: err.message };
        }
    }
}
exports.ProviderService = ProviderService;
