import crypto from 'crypto';
import { ENV } from '../config/env';

// AES-256-GCM authenticated encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the configured encryption key
 */
function getKey(): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(ENV.ENCRYPTION_KEY);
  return hash.digest();
}

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  tag: string;
}

export class EncryptionService {
  /**
   * Encrypts plain text using AES-256-GCM
   */
  static encrypt(plainText: string): EncryptedPayload {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      cipherText: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  /**
   * Decrypts AES-256-GCM payload with integrity verification
   */
  static decrypt(payload: EncryptedPayload): string {
    const key = getKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(tag);
    let decrypted = decipher.update(payload.cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypts plain text into a single secure string format: "iv:tag:cipherText"
   */
  static encryptToString(plainText: string): string {
    const enc = this.encrypt(plainText);
    return `${enc.iv}:${enc.tag}:${enc.cipherText}`;
  }

  /**
   * Decrypts a secure string formatted as "iv:tag:cipherText"
   */
  static decryptFromString(formattedString: string): string {
    const parts = formattedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    return this.decrypt({
      iv: parts[0],
      tag: parts[1],
      cipherText: parts[2],
    });
  }

  /**
   * Generates a cryptographically random API Key for users (e.g. ds_live_...)
   */
  static generateApiKey(prefix = 'ds_live_'): string {
    return prefix + crypto.randomBytes(24).toString('hex');
  }

  /**
   * Securely masks sensitive tokens for display (e.g., 8ce4...7ba)
   */
  static maskKey(key: string): string {
    if (!key || key.length < 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}
