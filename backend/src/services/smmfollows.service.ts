import { ProviderService } from './provider.service';
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
  desc?: string;
  descr?: string;
  description?: string;
  details?: string;
  info?: string;
  service_description?: string;
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

  private constructor() {}

  public static getInstance(): SMMFollowsService {
    if (!SMMFollowsService.instance) {
      SMMFollowsService.instance = new SMMFollowsService();
    }
    return SMMFollowsService.instance;
  }

  public async getBalance(): Promise<ProviderBalanceResponse> {
    return ProviderService.getInstance().getBalance('smmfollows');
  }

  public async getServices(): Promise<SMMFollowsServiceRaw[]> {
    return ProviderService.getInstance().getServices('smmfollows');
  }

  public async addOrder(params: SMMFollowsAddOrderParams): Promise<SMMFollowsAddOrderResponse> {
    return ProviderService.getInstance().addOrder('smmfollows', params);
  }

  public async getOrderStatus(orderId: string | number): Promise<SMMFollowsStatusResponse> {
    return ProviderService.getInstance().getOrderStatus('smmfollows', orderId);
  }

  public async getMultipleOrdersStatus(orderIds: (string | number)[]): Promise<Record<string, SMMFollowsStatusResponse>> {
    return ProviderService.getInstance().getMultipleOrdersStatus('smmfollows', orderIds);
  }

  public async refillOrder(orderId: string | number): Promise<{ refill?: number | string; error?: string }> {
    return ProviderService.getInstance().refillOrder('smmfollows', orderId);
  }

  public async cancelOrders(orderIds: (string | number)[]): Promise<any> {
    return ProviderService.getInstance().cancelOrders('smmfollows', orderIds);
  }
}
