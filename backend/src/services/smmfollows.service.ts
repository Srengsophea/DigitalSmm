import { DatabaseService } from './db.service';
import { ENV } from '../config/env';
import { ProviderBalanceResponse } from '../models/types';

export interface SMMFollowsServiceRaw {
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
}

export interface SMMFollowsAddOrderParams {
  service: number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
}

export interface SMMFollowsAddOrderResponse {
  order?: number;
  error?: string;
  raw?: any;
}

export interface SMMFollowsStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export class SMMFollowsService {
  private static instance: SMMFollowsService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): SMMFollowsService {
    if (!SMMFollowsService.instance) {
      SMMFollowsService.instance = new SMMFollowsService();
    }
    return SMMFollowsService.instance;
  }

  private getCredentials(): { apiKey: string; apiUrl: string } {
    const customKey = this.db.getSettingValue('smmfollows_api_key');
    const customUrl = this.db.getSettingValue('smmfollows_api_url');

    return {
      apiKey: customKey || ENV.SMMFOLLOWS_API_KEY,
      apiUrl: customUrl || ENV.SMMFOLLOWS_API_URL,
    };
  }

  /**
   * Helper to make authenticated POST requests to SMMFollows API
   */
  private async request<T>(action: string, extraParams: Record<string, any> = {}): Promise<T> {
    const { apiKey, apiUrl } = this.getCredentials();

    if (!apiKey) {
      throw new Error('SMMFollows API key is not configured');
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
        throw new Error(`SMMFollows HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('SMMFollows provider request timed out after 15s');
      }
      throw err;
    }
  }

  /**
   * Check Provider Account Balance
   */
  public async getBalance(): Promise<ProviderBalanceResponse> {
    try {
      const data = await this.request<{ balance?: string; currency?: string; error?: string }>('balance');
      if (data.error) {
        throw new Error(data.error);
      }
      return {
        balance: data.balance || '0.00',
        currency: data.currency || 'USD',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('Failed to fetch SMMFollows balance:', err.message);
      throw err;
    }
  }

  /**
   * Fetch complete services catalog from SMMFollows
   */
  public async getServices(): Promise<SMMFollowsServiceRaw[]> {
    try {
      const data = await this.request<any>('services');
      if (Array.isArray(data)) {
        return data as SMMFollowsServiceRaw[];
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
      return [];
    } catch (err: any) {
      console.error('Failed to fetch SMMFollows services:', err.message);
      throw err;
    }
  }

  /**
   * Place an order on SMMFollows
   */
  public async addOrder(params: SMMFollowsAddOrderParams): Promise<SMMFollowsAddOrderResponse> {
    try {
      const response = await this.request<any>('add', {
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
        error: 'Unexpected response from SMMFollows',
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
  public async getOrderStatus(orderId: string | number): Promise<SMMFollowsStatusResponse> {
    try {
      const data = await this.request<any>('status', { order: orderId });
      return data as SMMFollowsStatusResponse;
    } catch (err: any) {
      return {
        error: err.message,
      };
    }
  }

  /**
   * Check status of multiple orders (comma-separated IDs)
   */
  public async getMultipleOrdersStatus(orderIds: (string | number)[]): Promise<Record<string, SMMFollowsStatusResponse>> {
    try {
      const data = await this.request<any>('status', { orders: orderIds.join(',') });
      return data;
    } catch (err: any) {
      console.error('Failed to fetch multi-order status:', err.message);
      return {};
    }
  }
}
