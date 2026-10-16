import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import {
  User,
  ServiceItem,
  Order,
  Transaction,
  SettingItem,
  AuditLog,
  PlatformType,
  Ticket,
} from '../models/types';
import { EncryptionService } from './encryption.service';

interface DatabaseSchema {
  users: User[];
  services: ServiceItem[];
  orders: Order[];
  transactions: Transaction[];
  settings: Record<string, SettingItem>;
  auditLogs: AuditLog[];
  tickets: Ticket[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  private filePath: string;
  private data: DatabaseSchema;
  private writeLock: Promise<void> = Promise.resolve();

  private constructor() {
    this.filePath = path.join(ENV.DATA_DIR, 'digitalsmm.json');
    this.data = {
      users: [],
      services: [],
      orders: [],
      transactions: [],
      settings: {},
      auditLogs: [],
      tickets: [],
    };
    this.init();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private init(): void {
    if (!fs.existsSync(ENV.DATA_DIR)) {
      fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.tickets) this.data.tickets = [];
      } catch (err) {
        console.error('Error loading database file, initializing clean DB:', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }

    this.ensureAdminUser();
    this.ensureProviderSettings();
    this.ensureWelcomeTicket();
  }

  private seedDefaults(): void {
    this.data = {
      users: [],
      services: [],
      orders: [],
      transactions: [],
      settings: {},
      auditLogs: [],
      tickets: [],
    };
    this.persistSync();
  }

  private ensureAdminUser(): void {
    const existingAdmin = this.data.users.find(
      (u) => u.email.toLowerCase() === ENV.ADMIN_EMAIL.toLowerCase()
    );

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(12);
      const passwordHash = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        email: ENV.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        balance: 1000.0,
        role: 'ADMIN',
        status: 'active',
        apiKey: EncryptionService.generateApiKey('ds_adm_'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(adminUser);

      // Also create a demo regular user
      const demoUserHash = bcrypt.hashSync('User@DigitalSMM2026!', salt);
      const demoUser: User = {
        id: crypto.randomUUID(),
        username: 'demouser',
        email: 'user@digitalsmm.com',
        passwordHash: demoUserHash,
        balance: 100.0,
        role: 'USER',
        status: 'active',
        apiKey: EncryptionService.generateApiKey('ds_usr_'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(demoUser);

      this.data.transactions.push({
        id: crypto.randomUUID(),
        userId: demoUser.id,
        type: 'DEPOSIT',
        amount: 100.0,
        balanceBefore: 0,
        balanceAfter: 100.0,
        description: 'Welcome promotional deposit credited to your balance',
        createdAt: new Date().toISOString(),
      });

      this.persistSync();
      console.log('✅ Admin & Demo Users created successfully');
    }
  }

  private ensureProviderSettings(): void {
    const existingKey = this.getSettingValue('smmfollows_api_key');
    // If setting doesn't exist or was double-encrypted with a colon
    if (!existingKey || existingKey.includes(':')) {
      const encryptedKey = EncryptionService.encryptToString(ENV.SMMFOLLOWS_API_KEY);
      this.data.settings['smmfollows_api_key'] = {
        key: 'smmfollows_api_key',
        value: encryptedKey,
        isEncrypted: true,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.settings['smmfollows_api_url']) {
      this.data.settings['smmfollows_api_url'] = {
        key: 'smmfollows_api_url',
        value: ENV.SMMFOLLOWS_API_URL,
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.settings['default_markup_percent']) {
      this.data.settings['default_markup_percent'] = {
        key: 'default_markup_percent',
        value: ENV.DEFAULT_MARKUP_PERCENT.toString(),
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.settings['site_name']) {
      this.data.settings['site_name'] = {
        key: 'site_name',
        value: 'DigitalSMM - Social Media Marketing Hub',
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }
    this.persistSync();
  }

  /**
   * Thread-safe atomic file persistence using temporary file and atomic rename
   */
  private async persist(): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      const jsonContent = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(tempPath, jsonContent, 'utf8');
      await fs.promises.rename(tempPath, this.filePath);
    });
    return this.writeLock;
  }

  private persistSync(): void {
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    const jsonContent = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(tempPath, jsonContent, 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }

  // ================= USERS =================
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public getUserByApiKey(apiKey: string): User | undefined {
    return this.data.users.find((u) => u.apiKey === apiKey);
  }

  public async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'apiKey'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      apiKey: EncryptionService.generateApiKey('ds_usr_'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    await this.persist();
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.data.users[index] = {
      ...this.data.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.users[index];
  }

  /**
   * Atomically adjust a user's wallet balance and record a ledger transaction
   */
  public async adjustUserBalance(
    userId: string,
    amount: number,
    type: Transaction['type'],
    referenceId?: string,
    description?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const user = this.getUserById(userId);
    if (!user) {
      return { success: false, newBalance: 0, error: 'User not found' };
    }

    const currentBalance = user.balance;
    const newBalance = Number((currentBalance + amount).toFixed(4));

    if (newBalance < 0) {
      return { success: false, newBalance: currentBalance, error: 'Insufficient funds' };
    }

    user.balance = newBalance;
    user.updatedAt = new Date().toISOString();

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      userId,
      type,
      amount: Math.abs(amount),
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      referenceId,
      description: description || `Transaction ${type}`,
      createdAt: new Date().toISOString(),
    };

    this.data.transactions.unshift(transaction);
    await this.persist();

    return { success: true, newBalance };
  }

  // ================= SERVICES =================
  public getServices(): ServiceItem[] {
    return [...this.data.services];
  }

  public getServiceById(id: string): ServiceItem | undefined {
    return this.data.services.find((s) => s.id === id);
  }

  public getServiceByExternalId(externalId: number): ServiceItem | undefined {
    return this.data.services.find((s) => s.externalId === externalId);
  }

  public async upsertServices(rawServices: any[], markupPercent?: number): Promise<{ count: number }> {
    const activeMarkup = markupPercent ?? Number(this.getSettingValue('default_markup_percent') || '30');

    for (const raw of rawServices) {
      const externalId = Number(raw.service);
      const originalRate = parseFloat(raw.rate || '0');
      const rateMultiplier = 1 + activeMarkup / 100;
      const customRate = Number((originalRate * rateMultiplier).toFixed(4));

      const platform = this.detectPlatform(raw.category, raw.name);
      const existing = this.data.services.find((s) => s.externalId === externalId);

      if (existing) {
        existing.name = raw.name;
        existing.category = raw.category;
        existing.platform = platform;
        existing.originalRate = originalRate;
        // Keep existing customRate if admin manually adjusted it, otherwise apply markup
        if (!existing.customRate || existing.markupPercent === activeMarkup) {
          existing.customRate = customRate;
          existing.markupPercent = activeMarkup;
        }
        existing.min = parseInt(raw.min || '10', 10);
        existing.max = parseInt(raw.max || '10000', 10);
        existing.type = raw.type || 'Default';
        existing.dripfeed = Boolean(raw.dripfeed);
        existing.refill = Boolean(raw.refill);
        existing.cancel = Boolean(raw.cancel);
        existing.updatedAt = new Date().toISOString();
      } else {
        const newService: ServiceItem = {
          id: crypto.randomUUID(),
          externalId,
          name: raw.name,
          category: raw.category || 'General',
          platform,
          originalRate,
          customRate,
          markupPercent: activeMarkup,
          min: parseInt(raw.min || '10', 10),
          max: parseInt(raw.max || '10000', 10),
          type: raw.type || 'Default',
          isActive: true,
          dripfeed: Boolean(raw.dripfeed),
          refill: Boolean(raw.refill),
          cancel: Boolean(raw.cancel),
          updatedAt: new Date().toISOString(),
        };
        this.data.services.push(newService);
      }
    }

    await this.persist();
    return { count: this.data.services.length };
  }

  public async updateService(id: string, updates: Partial<ServiceItem>): Promise<ServiceItem | null> {
    const numId = Number(id);
    const index = this.data.services.findIndex((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
    if (index === -1) return null;

    const current = this.data.services[index];
    let customRate = updates.customRate !== undefined ? Number(updates.customRate) : current.customRate;
    let markupPercent = updates.markupPercent !== undefined ? Number(updates.markupPercent) : current.markupPercent;

    // If customRate was explicitly provided without markupPercent, compute markupPercent based on originalRate
    if (updates.customRate !== undefined && updates.markupPercent === undefined && current.originalRate > 0) {
      markupPercent = Number((((customRate - current.originalRate) / current.originalRate) * 100).toFixed(2));
    } else if (updates.markupPercent !== undefined && updates.customRate === undefined) {
      customRate = Number((current.originalRate * (1 + markupPercent / 100)).toFixed(4));
    }

    this.data.services[index] = {
      ...current,
      ...updates,
      customRate,
      markupPercent,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.services[index];
  }

  public async batchUpdateMarkup(options: {
    markupPercent?: number;
    fixedIncrease?: number;
    platform?: string;
    category?: string;
    serviceIds?: string[];
  }): Promise<{ updatedCount: number }> {
    const { markupPercent, fixedIncrease, platform, category, serviceIds } = options;
    let count = 0;
    const targetIds = serviceIds && serviceIds.length > 0 ? new Set(serviceIds.map(String)) : null;

    for (const service of this.data.services) {
      if (targetIds && !targetIds.has(service.id) && !targetIds.has(service.externalId.toString())) {
        continue;
      }
      if (platform && platform !== 'All' && service.platform.toLowerCase() !== platform.toLowerCase()) {
        continue;
      }
      if (category && category !== 'All' && !service.category.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      if (markupPercent !== undefined) {
        service.markupPercent = markupPercent;
        service.customRate = Number((service.originalRate * (1 + markupPercent / 100)).toFixed(4));
      } else if (fixedIncrease !== undefined) {
        service.customRate = Number((service.originalRate + fixedIncrease).toFixed(4));
        service.markupPercent = service.originalRate > 0
          ? Number((((service.customRate - service.originalRate) / service.originalRate) * 100).toFixed(2))
          : 0;
      }

      service.updatedAt = new Date().toISOString();
      count++;
    }

    if (!platform && !category && !serviceIds && markupPercent !== undefined) {
      await this.setSetting('default_markup_percent', markupPercent.toString(), false);
    }

    await this.persist();
    return { updatedCount: count };
  }

  public async bulkUpdateStatus(serviceIds: string[], isActive: boolean): Promise<number> {
    const idSet = new Set(serviceIds.map(String));
    let count = 0;
    for (const service of this.data.services) {
      if (idSet.has(service.id) || idSet.has(service.externalId.toString())) {
        service.isActive = isActive;
        service.updatedAt = new Date().toISOString();
        count++;
      }
    }
    await this.persist();
    return count;
  }

  private detectPlatform(category: string = '', name: string = ''): PlatformType {
    const combined = `${category} ${name}`.toLowerCase();
    if (combined.includes('instagram') || combined.includes('ig ')) return 'Instagram';
    if (combined.includes('tiktok') || combined.includes('tik tok')) return 'TikTok';
    if (combined.includes('youtube') || combined.includes('yt ')) return 'YouTube';
    if (combined.includes('telegram') || combined.includes('tg ')) return 'Telegram';
    if (combined.includes('twitter') || combined.includes('x.com') || combined.includes('tweet')) return 'Twitter';
    if (combined.includes('facebook') || combined.includes('fb ')) return 'Facebook';
    if (combined.includes('spotify')) return 'Spotify';
    if (combined.includes('discord')) return 'Discord';
    if (combined.includes('twitch')) return 'Twitch';
    if (combined.includes('linkedin')) return 'LinkedIn';
    if (combined.includes('threads')) return 'Threads';
    return 'Other';
  }

  // ================= ORDERS =================
  public getOrders(): Order[] {
    return [...this.data.orders];
  }

  public getOrdersByUserId(userId: string): Order[] {
    return this.data.orders.filter((o) => o.userId === userId);
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.orders.unshift(newOrder);
    await this.persist();
    return newOrder;
  }

  public async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    const index = this.data.orders.findIndex((o) => o.id === id);
    if (index === -1) return null;

    this.data.orders[index] = {
      ...this.data.orders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.orders[index];
  }

  // ================= TRANSACTIONS =================
  public getTransactions(): Transaction[] {
    return [...this.data.transactions];
  }

  public getTransactionsByUserId(userId: string): Transaction[] {
    return this.data.transactions.filter((t) => t.userId === userId);
  }

  // ================= SETTINGS =================
  public getSetting(key: string): SettingItem | undefined {
    return this.data.settings[key];
  }

  public getSettingValue(key: string): string | null {
    const item = this.data.settings[key];
    if (!item) return null;
    if (item.isEncrypted) {
      try {
        return EncryptionService.decryptFromString(item.value);
      } catch (err) {
        console.error(`Failed to decrypt setting ${key}:`, err);
        return null;
      }
    }
    return item.value;
  }

  public async setSetting(key: string, value: string, encrypt = false): Promise<void> {
    let storedValue = value;
    if (encrypt) {
      storedValue = EncryptionService.encryptToString(value);
    }
    this.data.settings[key] = {
      key,
      value: storedValue,
      isEncrypted: encrypt,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
  }

  // ================= AUDIT LOGS =================
  public async logAudit(action: string, details: string, ip: string, userId?: string, username?: string): Promise<void> {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      username,
      action,
      details,
      ip,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    await this.persist();
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  private ensureWelcomeTicket(): void {
    if (!this.data.tickets) this.data.tickets = [];
    if (this.data.tickets.length === 0) {
      const demoUser = this.data.users.find((u) => u.username === 'demouser');
      this.data.tickets.push({
        id: crypto.randomUUID(),
        ticketNumber: 1172282,
        userId: demoUser ? demoUser.id : 'demo-user-id',
        username: demoUser ? demoUser.username : 'demouser',
        subjectType: 'Orders',
        subType: 'Refill',
        orderIds: '27417914',
        message: "Welcome to SmmFollows.com We're glad you're here! Feel free to reach out for any order assistance.",
        referralSource: 'Search engines',
        status: 'New',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.persistSync();
    }
  }

  // ================= TICKETS =================
  public getTickets(): Ticket[] {
    return [...(this.data.tickets || [])];
  }

  public getTicketsByUserId(userId: string): Ticket[] {
    return (this.data.tickets || []).filter((t) => t.userId === userId);
  }

  public async createTicket(ticketData: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
    const maxNum = (this.data.tickets || []).reduce((max, t) => Math.max(max, t.ticketNumber || 0), 1172280);
    const newTicket: Ticket = {
      ...ticketData,
      id: crypto.randomUUID(),
      ticketNumber: maxNum + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!this.data.tickets) this.data.tickets = [];
    this.data.tickets.unshift(newTicket);
    await this.persist();
    return newTicket;
  }
}

