import { DatabaseService } from './db.service';
import { ENV } from '../config/env';
import { Provider, ProviderBalanceResponse } from '../models/types';
import { EncryptionService } from './encryption.service';

export interface ProviderServiceRaw {
  service: number | string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number | string;
  max: number | string;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
  desc?: string;
  descr?: string;
  description?: string;
  details?: string;
  info?: string;
  service_description?: string;
}

export interface ProviderAddOrderParams {
  service: number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
}

export interface ProviderAddOrderResponse {
  order?: number;
  error?: string;
  raw?: any;
}

export interface ProviderStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export class ProviderService {
  private static instance: ProviderService;

  private constructor() {}

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  /**
   * Helper to normalize API URL (e.g. https://smmpwr.com/api -> https://smmpwr.com/api/v2)
   */
  public normalizeApiUrl(url: string): string {
    if (!url) return '';
    let cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned.endsWith('/api')) {
      cleaned = `${cleaned}/v2`;
    }
    return cleaned;
  }

  /**
   * Retrieve active credentials for a given provider
   */
  public getCredentials(providerId?: string): { id: string; name: string; apiKey: string; apiUrl: string } {
    const db = DatabaseService.getInstance();
    const pid = (providerId || 'smmfollows').toLowerCase().trim();

    const provider = db.getProviderById(pid);
    if (provider) {
      // In case key is encrypted
      const apiKey = provider.apiKey.includes(':')
        ? EncryptionService.decryptFromString(provider.apiKey) || provider.apiKey
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
      apiKey: customKey || ENV.SMMFOLLOWS_API_KEY,
      apiUrl: this.normalizeApiUrl(customUrl || ENV.SMMFOLLOWS_API_URL),
    };
  }

  /**
   * Universal authenticated POST request to SMM panel APIs
   * Uses application/x-www-form-urlencoded for maximum compatibility across all SMM platforms
   */
  public async request<T>(
    providerId: string | undefined,
    action: string,
    extraParams: Record<string, any> = {}
  ): Promise<T> {
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
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Invalid JSON received from provider: ${text.slice(0, 100)}`);
      }

      return data as T;
    } catch (err: any) {
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
  public async getBalance(providerId?: string): Promise<ProviderBalanceResponse> {
    try {
      const data = await this.request<{ balance?: string; currency?: string; error?: string }>(
        providerId,
        'balance'
      );
      if (data.error) {
        throw new Error(data.error);
      }
      return {
        balance: data.balance || '0.00',
        currency: data.currency || 'USD',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error(`Failed to fetch ${providerId || 'provider'} balance:`, err.message);
      throw err;
    }
  }

  /**
   * Fetch complete raw services catalog from provider
   */
  public async getServices(providerId?: string): Promise<ProviderServiceRaw[]> {
    try {
      const data = await this.request<any>(providerId, 'services');
      if (Array.isArray(data)) {
        return data as ProviderServiceRaw[];
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
      return [];
    } catch (err: any) {
      console.error(`Failed to fetch services from ${providerId || 'provider'}:`, err.message);
      throw err;
    }
  }

  /**
   * Place an order on provider
   */
  public async addOrder(
    providerId: string | undefined,
    params: ProviderAddOrderParams
  ): Promise<ProviderAddOrderResponse> {
    try {
      const response = await this.request<any>(providerId, 'add', {
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
    } catch (err: any) {
      return {
        error: err.message || 'Provider connection error',
      };
    }
  }

  /**
   * Check status of a single order
   */
  public async getOrderStatus(
    providerId: string | undefined,
    orderId: string | number
  ): Promise<ProviderStatusResponse> {
    try {
      const data = await this.request<any>(providerId, 'status', { order: orderId });
      return data as ProviderStatusResponse;
    } catch (err: any) {
      return {
        error: err.message,
      };
    }
  }

  /**
   * Check status of multiple orders (comma-separated IDs)
   */
  public async getMultipleOrdersStatus(
    providerId: string | undefined,
    orderIds: (string | number)[]
  ): Promise<Record<string, ProviderStatusResponse>> {
    try {
      const data = await this.request<any>(providerId, 'status', { orders: orderIds.join(',') });
      return data || {};
    } catch (err: any) {
      console.error(`Failed to fetch multi-order status from ${providerId}:`, err.message);
      return {};
    }
  }

  /**
   * Request refill for an order on provider
   */
  public async refillOrder(
    providerId: string | undefined,
    orderId: string | number
  ): Promise<{ refill?: number | string; error?: string }> {
    try {
      const data = await this.request<any>(providerId, 'refill', { order: orderId });
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * Request cancellation for orders on provider
   */
  public async cancelOrders(
    providerId: string | undefined,
    orderIds: (string | number)[]
  ): Promise<any> {
    try {
      const data = await this.request<any>(providerId, 'cancel', { orders: orderIds.join(',') });
      return data;
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
