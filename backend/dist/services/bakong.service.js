"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BakongService = void 0;
class BakongService {
    static instance;
    baseUrl = 'https://lorndavid.online';
    // Default merchant Bakong ID (can be customized via settings or admin)
    defaultAccountId = 'lorn_davit@bkrt';
    static getInstance() {
        if (!BakongService.instance) {
            BakongService.instance = new BakongService();
        }
        return BakongService.instance;
    }
    /**
     * Generate a dynamic Bakong KHQR payload
     */
    async generateKHQR(params) {
        const payload = {
            accountId: params.accountId || this.defaultAccountId,
            amount: params.amount,
            currency: params.currency || 'USD',
            merchantName: params.merchantName || 'DigitalSMM Service',
            merchantCity: params.merchantCity || 'Phnom Penh',
            billNumber: params.billNumber,
            storeLabel: params.storeLabel || 'DigitalSMM',
            static: false,
        };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/khqr/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'DigitalSMM-KhqrClient/1.0',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`KHQR generation failed: HTTP ${response.status} ${response.statusText}`);
            }
            const json = await response.json();
            return json;
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Failed to communicate with Bakong gateway: ${err.message}`);
        }
    }
    /**
     * Check payment status by MD5 hash
     */
    async checkPayment(md5) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/check/${md5}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DigitalSMM-KhqrClient/1.0',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`Payment verification failed: HTTP ${response.status}`);
            }
            const json = await response.json();
            return json;
        }
        catch (err) {
            clearTimeout(timeout);
            throw new Error(`Failed to check Bakong payment: ${err.message}`);
        }
    }
}
exports.BakongService = BakongService;
