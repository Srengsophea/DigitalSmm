"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TotpService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
class TotpService {
    static ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    /**
     * Generate a random 16-character Base32 secret key (80 bits of entropy)
     */
    static generateSecret(length = 16) {
        const randomBytes = crypto_1.default.randomBytes(length);
        let secret = '';
        for (let i = 0; i < length; i++) {
            secret += TotpService.ALPHABET[randomBytes[i] % 32];
        }
        return secret;
    }
    /**
     * Decode Base32 string to binary Buffer
     */
    static base32Decode(base32) {
        const cleaned = base32.toUpperCase().replace(/[\s=-]/g, '');
        let bits = 0;
        let value = 0;
        const bytes = [];
        for (let i = 0; i < cleaned.length; i++) {
            const idx = TotpService.ALPHABET.indexOf(cleaned[i]);
            if (idx === -1)
                continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Buffer.from(bytes);
    }
    /**
     * Generate 6-digit TOTP token according to RFC 6238 HMAC-SHA1
     */
    static generateToken(secret, timeStepSeconds = 30, epochSeconds = Math.floor(Date.now() / 1000)) {
        const counter = Math.floor(epochSeconds / timeStepSeconds);
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigInt64BE(BigInt(counter));
        const keyBuffer = TotpService.base32Decode(secret);
        const hmac = crypto_1.default.createHmac('sha1', keyBuffer);
        hmac.update(counterBuffer);
        const digest = hmac.digest();
        const offset = digest[digest.length - 1] & 0x0f;
        const binary = ((digest[offset] & 0x7f) << 24) |
            ((digest[offset + 1] & 0xff) << 16) |
            ((digest[offset + 2] & 0xff) << 8) |
            (digest[offset + 3] & 0xff);
        const otp = binary % 1000000;
        return otp.toString().padStart(6, '0');
    }
    /**
     * Verify TOTP token with +/- window tolerance (default window = 1: +/- 30 seconds)
     */
    static verifyToken(token, secret, window = 1) {
        if (!token || !secret)
            return false;
        const cleanToken = token.trim();
        if (cleanToken.length !== 6)
            return false;
        const currentEpoch = Math.floor(Date.now() / 1000);
        for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
            const expected = TotpService.generateToken(secret, 30, currentEpoch + errorWindow * 30);
            if (expected === cleanToken) {
                return true;
            }
        }
        return false;
    }
    /**
     * Construct standard otpauth:// URL for authenticator apps
     */
    static getOtpAuthUrl(accountName, secret, issuer = 'DigitalSMM') {
        const label = encodeURIComponent(`${issuer}:${accountName}`);
        const encodedIssuer = encodeURIComponent(issuer);
        return `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
    }
    /**
     * Generate base64 PNG data URL of the QR code
     */
    static async generateQrCodeDataUrl(otpAuthUrl) {
        return qrcode_1.default.toDataURL(otpAuthUrl, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 240,
            color: {
                dark: '#0f172a',
                light: '#ffffff',
            },
        });
    }
}
exports.TotpService = TotpService;
