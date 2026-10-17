"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BakongService = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const env_1 = require("../config/env");
const db_service_1 = require("./db.service");
// Use bakong-khqr SDK for genuine NBC EMVCo KHQR generation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');
class BakongService {
    static instance;
    khqrSDK = new BakongKHQR();
    gatewayUrl = 'https://lorndavid.online';
    nbcApiUrl = 'https://api-bakong.nbc.gov.kh';
    static getInstance() {
        if (!BakongService.instance) {
            BakongService.instance = new BakongService();
        }
        return BakongService.instance;
    }
    getAccountId() {
        const db = db_service_1.DatabaseService.getInstance();
        return db.getSettingValue('bakong_account_id') || env_1.ENV.BAKONG_ACCOUNT_ID || 'sophea_sreng2@bkrt';
    }
    getMerchantName() {
        const db = db_service_1.DatabaseService.getInstance();
        return db.getSettingValue('bakong_merchant_name') || env_1.ENV.BAKONG_MERCHANT_NAME || 'Digital Smm';
    }
    getMerchantCity() {
        const db = db_service_1.DatabaseService.getInstance();
        return db.getSettingValue('bakong_merchant_city') || env_1.ENV.BAKONG_MERCHANT_CITY || 'Phnom Penh';
    }
    getBakongToken() {
        const db = db_service_1.DatabaseService.getInstance();
        return db.getSettingValue('bakong_token') || env_1.ENV.BAKONG_TOKEN || '';
    }
    /**
     * Generate genuine, NBC-compliant Bakong KHQR for sophea_sreng2@bkrt
     */
    async generateKHQR(params) {
        const accountId = params.accountId || this.getAccountId();
        const merchantName = params.merchantName || this.getMerchantName();
        const merchantCity = params.merchantCity || this.getMerchantCity();
        const currency = params.currency === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd;
        const expirationTimestamp = Date.now() + 15 * 60 * 1000; // 15-minute dynamic expiration
        const individualInfo = new IndividualInfo(accountId, merchantName, merchantCity, {
            currency,
            amount: params.amount,
            billNumber: params.billNumber,
            storeLabel: params.storeLabel || 'DigitalSMM',
            terminalLabel: 'Web',
            expirationTimestamp,
        });
        const khqrResult = this.khqrSDK.generateIndividual(individualInfo);
        if (khqrResult.status && khqrResult.status.code !== 0) {
            throw new Error(`KHQR generation error: ${khqrResult.status.message || 'Invalid parameters'}`);
        }
        const qrString = khqrResult.data.qr;
        const md5 = khqrResult.data.md5;
        // Generate crisp base64 PNG data URL directly on server
        let qrImage = '';
        try {
            qrImage = await qrcode_1.default.toDataURL(qrString, {
                margin: 1,
                width: 320,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
                errorCorrectionLevel: 'M',
            });
        }
        catch (e) {
            // Fallback data URL if QRCode throws
            qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrString)}`;
        }
        return {
            status: 'success',
            data: {
                md5,
                qrString,
                qrImage,
                deeplink: `bakong://qr?data=${encodeURIComponent(qrString)}`,
                accountId,
                merchantName,
                merchantCity,
                amount: params.amount,
                currency: params.currency || 'USD',
                billNumber: params.billNumber,
            },
        };
    }
    /**
     * Check real Bakong payment settlement by MD5 hash
     */
    async checkPayment(md5) {
        const token = this.getBakongToken();
        // 1. If NBC Bakong Developer Token is configured, query official NBC Open API
        if (token) {
            try {
                const nbcResponse = await fetch(`${this.nbcApiUrl}/v1/check_transaction_by_md5`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ md5 }),
                });
                if (nbcResponse.ok) {
                    const json = await nbcResponse.json();
                    if (json.responseCode === 0) {
                        return {
                            responseCode: 0,
                            responseMessage: 'Payment confirmed by NBC Bakong',
                            data: json.data,
                        };
                    }
                }
            }
            catch (err) {
                console.warn('Direct NBC API check error, falling back to gateway:', err.message);
            }
        }
        // 2. Query live Bakong verification gateway
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${this.gatewayUrl}/api/v1/check/${md5}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DigitalSMM-KhqrClient/1.0',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`Payment verification gateway returned HTTP ${response.status}`);
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
