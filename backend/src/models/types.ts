export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  balance: number;
  role: UserRole;
  status: 'active' | 'suspended';
  apiKey: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  timezone?: string;
  apiKeyCreatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlatformType =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube'
  | 'Telegram'
  | 'Twitter'
  | 'Facebook'
  | 'Spotify'
  | 'Discord'
  | 'Twitch'
  | 'LinkedIn'
  | 'Threads'
  | 'Other';

export interface ServiceItem {
  id: string;
  externalId: number; // SMMFollows service ID
  name: string;
  category: string;
  platform: PlatformType;
  originalRate: number; // Provider rate per 1000
  customRate: number; // Resale rate per 1000 with markup
  markupPercent: number; // Markup percentage
  min: number;
  max: number;
  type: string;
  isActive: boolean;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
  description?: string;
  updatedAt: string;
}

export interface ServiceOverride {
  customRate?: number;
  markupPercent?: number;
  fixedIncrease?: number;
  isActive?: boolean;
  updatedAt?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'CANCELED';

export interface Order {
  id: string;
  userId: string;
  username?: string;
  serviceId: string;
  externalServiceId: number;
  serviceName: string;
  category: string;
  platform: PlatformType;
  externalOrderId?: string | number;
  link: string;
  quantity: number;
  ratePerThousand: number;
  charge: number; // Amount user paid
  originalCost: number; // Amount paid to SMMFollows
  profit: number; // charge - originalCost
  status: OrderStatus;
  startCount?: string | number;
  remains?: string | number;
  providerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'ORDER_CHARGE'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // Order ID or Payment Reference
  description: string;
  createdAt: string;
}

export interface SettingItem {
  key: string;
  value: string; // Plain or encrypted
  isEncrypted: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  userId: string;
  username: string;
  subjectType: string;
  subType?: string;
  orderIds?: string;
  message: string;
  referralSource?: string;
  status: 'New' | 'Answered' | 'In Progress' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export interface ProviderBalanceResponse {
  balance: string;
  currency: string;
  rawResponse?: any;
}

export interface PendingSignup {
  username: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}


