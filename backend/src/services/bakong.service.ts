import QRCode from 'qrcode';
import { ENV } from '../config/env';
import { DatabaseService } from './db.service';

// Use bakong-khqr SDK for genuine NBC EMVCo KHQR generation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BakongKHQR, IndividualInfo, khqrData } = require('bakong-khqr');

export interface KHQRGenerateParams {
  accountId?: string;
  amount: number;
  currency?: 'USD' | 'KHR';
  merchantName?: string;
  merchantCity?: string;
  billNumber: string;
  storeLabel?: string;
}

export interface KHQRGenerateResponse {
  status: string;
  data: {
    md5: string;
    qrString: string;
    qrImage?: string; // base64 PNG data URL
    deeplink?: string;
    accountId: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    currency: string;
    billNumber: string;
  };
}

export interface BakongCheckResponse {
  responseCode: number; // 0 = confirmed, 1 = unconfirmed/pending
  responseMessage: string;
  data?: {
    hash?: string;
    fromAccountId?: string;
    toAccountId?: string;
    amount?: number;
    currency?: string;
    description?: string;
    createdDateMs?: number;
  };
}

export class BakongService {
  private static instance: BakongService;
  private khqrSDK = new BakongKHQR();
  private readonly gatewayUrl = 'https://lorndavid.online';
  private readonly nbcApiUrl = 'https://api-bakong.nbc.gov.kh';

  public static getInstance(): BakongService {
    if (!BakongService.instance) {
      BakongService.instance = new BakongService();
    }
    return BakongService.instance;
  }

  public getAccountId(): string {
    const db = DatabaseService.getInstance();
    return db.getSettingValue('bakong_account_id') || ENV.BAKONG_ACCOUNT_ID || 'sophea_sreng2@bkrt';
  }

  public getMerchantName(): string {
    const db = DatabaseService.getInstance();
    return db.getSettingValue('bakong_merchant_name') || ENV.BAKONG_MERCHANT_NAME || 'Digital Smm';
  }

  public getMerchantCity(): string {
    const db = DatabaseService.getInstance();
    return db.getSettingValue('bakong_merchant_city') || ENV.BAKONG_MERCHANT_CITY || 'Phnom Penh';
  }

  public getBakongToken(): string {
    const db = DatabaseService.getInstance();
    return db.getSettingValue('bakong_token') || ENV.BAKONG_TOKEN || '';
  }

  /**
   * Generate genuine, NBC-compliant Bakong KHQR for sophea_sreng2@bkrt
   */
  public async generateKHQR(params: KHQRGenerateParams): Promise<KHQRGenerateResponse> {
    const accountId = params.accountId || this.getAccountId();
    const merchantName = params.merchantName || this.getMerchantName();
    const merchantCity = params.merchantCity || this.getMerchantCity();
    const currency = params.currency === 'KHR' ? khqrData.currency.khr : khqrData.currency.usd;
    const expirationTimestamp = Date.now() + 15 * 60 * 1000; // 15-minute dynamic expiration

    const individualInfo = new IndividualInfo(
      accountId,
      merchantName,
      merchantCity,
      {
        currency,
        amount: params.amount,
        billNumber: params.billNumber,
        storeLabel: params.storeLabel || 'DigitalSMM',
        terminalLabel: 'Web',
        expirationTimestamp,
      }
    );

    const khqrResult = this.khqrSDK.generateIndividual(individualInfo);

    if (khqrResult.status && khqrResult.status.code !== 0) {
      throw new Error(`KHQR generation error: ${khqrResult.status.message || 'Invalid parameters'}`);
    }

    const qrString: string = khqrResult.data.qr;
    const md5: string = khqrResult.data.md5;

    // Generate crisp base64 PNG data URL directly on server
    let qrImage = '';
    try {
      qrImage = await QRCode.toDataURL(qrString, {
        margin: 1,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
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
  public async checkPayment(md5: string): Promise<BakongCheckResponse> {
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
          const json: any = await nbcResponse.json();
          if (json.responseCode === 0) {
            return {
              responseCode: 0,
              responseMessage: 'Payment confirmed by NBC Bakong',
              data: json.data,
            };
          }
        }
      } catch (err: any) {
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
      return json as BakongCheckResponse;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to check Bakong payment: ${err.message}`);
    }
  }
}
