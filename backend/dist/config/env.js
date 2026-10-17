"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const defaultEncryptionKey = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
exports.ENV = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'digitalsmm_jwt_super_secure_secret_2026_xyz987',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    ENCRYPTION_KEY: defaultEncryptionKey,
    SMMFOLLOWS_API_KEY: process.env.SMMFOLLOWS_API_KEY || '8ce4373a1a1602790e0bef11a65707ba',
    SMMFOLLOWS_API_URL: process.env.SMMFOLLOWS_API_URL || 'https://smmfollows.com/api/v2',
    DEFAULT_MARKUP_PERCENT: parseFloat(process.env.DEFAULT_MARKUP_PERCENT || '30'),
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@digitalsmm.com',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@DigitalSMM2026!',
    CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5000'],
    DATA_DIR: process.env.DATA_DIR || path_1.default.resolve(__dirname, '../../data'),
    BAKONG_ACCOUNT_ID: process.env.BAKONG_ACCOUNT_ID || 'sophea_sreng2@bkrt',
    BAKONG_MERCHANT_NAME: process.env.BAKONG_MERCHANT_NAME || 'Digital Smm',
    BAKONG_MERCHANT_CITY: process.env.BAKONG_MERCHANT_CITY || 'Phnom Penh',
    BAKONG_TOKEN: process.env.BAKONG_TOKEN || '',
};
