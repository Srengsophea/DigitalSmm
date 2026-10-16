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
    qrImage?: string; // base64 PNG data URL or image
    deeplink?: string;
    bakongScheme?: string;
    checkUrl?: string;
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
  private readonly baseUrl = 'https://lorndavid.online';
  // Default merchant Bakong ID (can be customized via settings or admin)
  private readonly defaultAccountId = 'lorn_davit@bkrt';

  public static getInstance(): BakongService {
    if (!BakongService.instance) {
      BakongService.instance = new BakongService();
    }
    return BakongService.instance;
  }

  /**
   * Generate a dynamic Bakong KHQR payload
   */
  public async generateKHQR(params: KHQRGenerateParams): Promise<KHQRGenerateResponse> {
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
      return json as KHQRGenerateResponse;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to communicate with Bakong gateway: ${err.message}`);
    }
  }

  /**
   * Check payment status by MD5 hash
   */
  public async checkPayment(md5: string): Promise<BakongCheckResponse> {
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
      return json as BakongCheckResponse;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to check Bakong payment: ${err.message}`);
    }
  }
}
