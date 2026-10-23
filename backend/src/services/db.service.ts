import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import {
  User,
  SafeUser,
  ServiceItem,
  ServiceOverride,
  Order,
  Transaction,
  SettingItem,
  AuditLog,
  PlatformType,
  Ticket,
} from '../models/types';
import { EncryptionService } from './encryption.service';
import { SMMFollowsService } from './smmfollows.service';
import { PostgresService } from './postgres.service';

/**
 * Strips password hashes, TOTP secrets, and internal security counters before sending user data over wire.
 */
export function toSafeUser(user: User, totalSpent?: number, totalOrders?: number): SafeUser {
  const { passwordHash: _, twoFactorSecret: __, failedLoginAttempts: ___, lockoutUntil: ____, ...safe } = user;
  let spent = totalSpent;
  let ordersCount = totalOrders;
  if (spent === undefined || ordersCount === undefined) {
    try {
      const db = DatabaseService.getInstance();
      if (spent === undefined) spent = db.getUserTotalSpent(user.id);
      if (ordersCount === undefined) ordersCount = db.getUserTotalOrders(user.id);
    } catch {
      spent = user.totalSpent ?? 0;
      ordersCount = user.totalOrders ?? 0;
    }
  }
  return {
    ...safe,
    totalSpent: spent,
    totalOrders: ordersCount,
  };
}

interface DatabaseSchema {
  users: User[];
  services: ServiceItem[];
  serviceOverrides?: Record<string, ServiceOverride>;
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
  private inMemoryServices: ServiceItem[] = [];
  private lastServiceFetchTime: number = 0;
  private serviceFetchPromise: Promise<ServiceItem[]> | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
  private writeLock: Promise<void> = Promise.resolve();

  private constructor() {
    DatabaseService.instance = this;
    this.filePath = path.join(ENV.DATA_DIR, 'digitalsmm.json');
    this.data = {
      users: [],
      services: [],
      serviceOverrides: {},
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
      new DatabaseService();
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
        if (!this.data.serviceOverrides) this.data.serviceOverrides = {};
        // Ensure services is empty in this.data; services live in memory from SMMFollows
        this.data.services = [];
      } catch (err) {
        console.error('Error loading database file, initializing clean DB:', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }

    this.ensureAdminUser();
    this.ensureProviderSettings();

    // Asynchronously connect to PostgreSQL if configured, then preload services
    setImmediate(async () => {
      await this.initPostgres();
      this.getServicesAsync().catch((err) => {
        console.warn('Initial SMMFollows services fetch warning:', err.message);
      });
    });
  }

  private async initPostgres(): Promise<void> {
    const pg = PostgresService.getInstance();
    if (pg.isEnabled()) {
      const ok = await pg.init();
      if (ok) {
        await this.hydrateFromPostgres();
      }
    }
  }

  public async hydrateFromPostgres(): Promise<void> {
    const pg = PostgresService.getInstance();
    if (!pg.isHealthy()) return;
    try {
      const [users, orders, transactions, tickets, logs] = await Promise.all([
        pg.getAllUsers(),
        pg.getOrders(),
        pg.getTransactions(),
        pg.getTickets(),
        pg.getAuditLogs(),
      ]);
      this.data.users = users;
      this.data.orders = orders;
      this.data.transactions = transactions;
      this.data.tickets = tickets;
      this.data.auditLogs = logs;
      console.log(`⚡ PostgreSQL Active: ${users.length} users, ${orders.length} orders loaded into in-memory hot cache.`);
    } catch (err: any) {
      console.warn('Could not hydrate in-memory cache from PostgreSQL:', err.message);
    }
  }

  private seedDefaults(): void {
    this.data = {
      users: [],
      services: [],
      serviceOverrides: {},
      orders: [],
      transactions: [],
      settings: {},
      auditLogs: [],
      tickets: [],
    };
    this.persistSync();
  }

  private ensureAdminUser(): void {
    const targetEmail = ENV.ADMIN_EMAIL.toLowerCase();
    const existingAdmin = this.data.users.find(
      (u) => u.email.toLowerCase() === targetEmail
    );

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(12);
      const passwordHash = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        email: targetEmail,
        passwordHash,
        balance: 1000.0,
        role: 'ADMIN',
        status: 'active',
        apiKey: EncryptionService.generateApiKey('ds_adm_'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(adminUser);
      this.persistSync();
      console.log(`✅ Admin User (${targetEmail}) initialized successfully`);
    } else {
      let changed = false;
      if (existingAdmin.role !== 'ADMIN') {
        existingAdmin.role = 'ADMIN';
        changed = true;
      }
      if (existingAdmin.status !== 'active') {
        existingAdmin.status = 'active';
        changed = true;
      }
      if (existingAdmin.failedLoginAttempts && existingAdmin.failedLoginAttempts > 0) {
        existingAdmin.failedLoginAttempts = 0;
        delete existingAdmin.lockoutUntil;
        changed = true;
      }
      if (ENV.ADMIN_PASSWORD && !bcrypt.compareSync(ENV.ADMIN_PASSWORD, existingAdmin.passwordHash)) {
        const salt = bcrypt.genSaltSync(12);
        existingAdmin.passwordHash = bcrypt.hashSync(ENV.ADMIN_PASSWORD, salt);
        changed = true;
      }
      if (changed) {
        existingAdmin.updatedAt = new Date().toISOString();
        this.persistSync();
        console.log(`✅ Admin User (${targetEmail}) synchronized with role: ADMIN and updated credentials`);
      }
    }

    // Also unlock default admin@digitalsmm.com if locked
    const defaultAdmin = this.data.users.find(
      (u) => u.email.toLowerCase() === 'admin@digitalsmm.com'
    );
    if (defaultAdmin && (defaultAdmin.failedLoginAttempts || defaultAdmin.lockoutUntil)) {
      defaultAdmin.failedLoginAttempts = 0;
      delete defaultAdmin.lockoutUntil;
      this.persistSync();
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

    if (!this.data.settings['bakong_account_id']) {
      this.data.settings['bakong_account_id'] = {
        key: 'bakong_account_id',
        value: ENV.BAKONG_ACCOUNT_ID,
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.settings['bakong_merchant_name']) {
      this.data.settings['bakong_merchant_name'] = {
        key: 'bakong_merchant_name',
        value: ENV.BAKONG_MERCHANT_NAME,
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.settings['bakong_merchant_city']) {
      this.data.settings['bakong_merchant_city'] = {
        key: 'bakong_merchant_city',
        value: ENV.BAKONG_MERCHANT_CITY,
        isEncrypted: false,
        updatedAt: new Date().toISOString(),
      };
    }

    this.persistSync();
  }

  /**
   * Thread-safe atomic file persistence with Windows file-lock fallback
   */
  private async persist(): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      // Never store raw services in the JSON file; services are fetched live from SMMFollows
      const toPersist: DatabaseSchema = {
        ...this.data,
        services: [],
      };
      const jsonContent = JSON.stringify(toPersist, null, 2);
      try {
        await fs.promises.writeFile(tempPath, jsonContent, 'utf8');
        try {
          await fs.promises.rename(tempPath, this.filePath);
        } catch (renameErr) {
          // Fallback for Windows file-locking / EPERM
          await fs.promises.copyFile(tempPath, this.filePath);
          await fs.promises.unlink(tempPath).catch(() => {});
        }
      } catch (err) {
        console.error('Error persisting database:', err);
      }
    });
    return this.writeLock;
  }

  private persistSync(): void {
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    const toPersist: DatabaseSchema = {
      ...this.data,
      services: [],
    };
    const jsonContent = JSON.stringify(toPersist, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonContent, 'utf8');
      try {
        fs.renameSync(tempPath, this.filePath);
      } catch (err) {
        fs.copyFileSync(tempPath, this.filePath);
        try {
          fs.unlinkSync(tempPath);
        } catch (_) {}
      }
    } catch (writeErr) {
      fs.writeFileSync(this.filePath, jsonContent, 'utf8');
    }
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
    if (!apiKey || typeof apiKey !== 'string') return undefined;
    const targetBuffer = Buffer.from(apiKey);
    return this.data.users.find((u) => {
      if (!u.apiKey) return false;
      const userKeyBuffer = Buffer.from(u.apiKey);
      if (userKeyBuffer.length !== targetBuffer.length) return false;
      return crypto.timingSafeEqual(userKeyBuffer, targetBuffer);
    });
  }

  public async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'apiKey'>): Promise<User> {
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const newUser = await pg.createUser(user);
      this.data.users.push(newUser);
      return newUser;
    }

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
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const updated = await pg.updateUser(id, updates);
      if (updated) {
        const index = this.data.users.findIndex((u) => u.id === id);
        if (index !== -1) this.data.users[index] = updated;
      }
      return updated;
    }

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
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const result = await pg.adjustUserBalance(userId, amount, type, referenceId, description);
      if (result.success) {
        const user = this.data.users.find((u) => u.id === userId);
        if (user) {
          user.balance = result.newBalance;
          user.updatedAt = new Date().toISOString();
        }
      }
      return result;
    }

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
  /**
   * Asynchronously fetch services dynamically from SMMFollows with in-memory TTL caching
   */
  public async getServicesAsync(forceRefresh = false): Promise<ServiceItem[]> {
    const isCacheValid =
      !forceRefresh &&
      this.inMemoryServices.length > 0 &&
      Date.now() - this.lastServiceFetchTime < DatabaseService.CACHE_TTL_MS;

    if (isCacheValid) {
      return [...this.inMemoryServices];
    }

    if (this.serviceFetchPromise) {
      return this.serviceFetchPromise;
    }

    this.serviceFetchPromise = (async () => {
      try {
        const smm = SMMFollowsService.getInstance();
        const rawServices = await smm.getServices();
        if (Array.isArray(rawServices) && rawServices.length > 0) {
          this.inMemoryServices = this.transformRawServices(rawServices);
          this.lastServiceFetchTime = Date.now();
          console.log(`✅ Loaded ${this.inMemoryServices.length} live services from SMMFollows`);
        }
        return [...this.inMemoryServices];
      } catch (err: any) {
        console.error('Failed to fetch services from SMMFollows:', err.message);
        if (this.inMemoryServices.length > 0) {
          console.log('Serving from existing in-memory cache as fallback');
          return [...this.inMemoryServices];
        }
        return [];
      } finally {
        this.serviceFetchPromise = null;
      }
    })();

    return this.serviceFetchPromise;
  }

  /**
   * Synchronous getter for in-memory services
   */
  public getServices(): ServiceItem[] {
    return [...this.inMemoryServices];
  }

  public async getServiceByIdAsync(id: string): Promise<ServiceItem | undefined> {
    const services = await this.getServicesAsync();
    const numId = Number(id);
    return services.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
  }

  public async getServiceByExternalIdAsync(externalId: number): Promise<ServiceItem | undefined> {
    const services = await this.getServicesAsync();
    return services.find((s) => s.externalId === externalId);
  }

  public getServiceById(id: string): ServiceItem | undefined {
    const numId = Number(id);
    return this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
  }

  public getServiceByExternalId(externalId: number): ServiceItem | undefined {
    return this.inMemoryServices.find((s) => s.externalId === externalId);
  }

  /**
   * Transform raw SMMFollows catalog items into full DigitalSMM ServiceItem objects,
   * applying default markup and individual admin service overrides.
   */
  private transformRawServices(rawServices: any[]): ServiceItem[] {
    const defaultMarkup = Number(this.getSettingValue('default_markup_percent') || '30');
    const overrides = this.data.serviceOverrides || {};
    const items: ServiceItem[] = [];

    for (const raw of rawServices) {
      const externalId = Number(raw.service);
      if (isNaN(externalId)) continue;

      const originalRate = parseFloat(raw.rate || '0');
      const extKey = String(externalId);
      const override = overrides[extKey];

      let customRate: number;
      let markupPercent: number;
      let isActive = true;

      if (override) {
        if (override.isActive !== undefined) {
          isActive = Boolean(override.isActive);
        }
        if (override.customRate !== undefined) {
          customRate = Number(override.customRate);
          markupPercent =
            override.markupPercent ??
            (originalRate > 0
              ? Number((((customRate - originalRate) / originalRate) * 100).toFixed(2))
              : defaultMarkup);
        } else if (override.markupPercent !== undefined) {
          markupPercent = Number(override.markupPercent);
          customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
        } else if (override.fixedIncrease !== undefined) {
          customRate = Number((originalRate + override.fixedIncrease).toFixed(4));
          markupPercent =
            originalRate > 0
              ? Number((((customRate - originalRate) / originalRate) * 100).toFixed(2))
              : 0;
        } else {
          markupPercent = defaultMarkup;
          customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
        }
      } else {
        markupPercent = defaultMarkup;
        customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
      }

      const platform = this.detectPlatform(raw.category, raw.name);

      items.push({
        id: String(externalId),
        externalId,
        name: raw.name || `Service #${externalId}`,
        category: raw.category || 'General',
        platform,
        originalRate,
        customRate,
        markupPercent,
        min: parseInt(raw.min || '10', 10),
        max: parseInt(raw.max || '10000', 10),
        type: raw.type || 'Default',
        isActive,
        dripfeed: Boolean(raw.dripfeed),
        refill: override?.refill !== undefined ? Boolean(override.refill) : this.detectRefill(raw),
        cancel: override?.cancel !== undefined ? Boolean(override.cancel) : this.detectCancel(raw),
        updatedAt: override?.updatedAt || new Date().toISOString(),
      });
    }

    return items;
  }

  public async upsertServices(rawServices: any[], markupPercent?: number): Promise<{ count: number }> {
    if (markupPercent !== undefined && !isNaN(markupPercent)) {
      await this.setSetting('default_markup_percent', markupPercent.toString(), false);
    }
    if (Array.isArray(rawServices) && rawServices.length > 0) {
      this.inMemoryServices = this.transformRawServices(rawServices);
      this.lastServiceFetchTime = Date.now();
    }
    return { count: this.inMemoryServices.length };
  }

  public async updateService(id: string, updates: Partial<ServiceItem>): Promise<ServiceItem | null> {
    await this.getServicesAsync();
    const numId = Number(id);
    const target = this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
    if (!target) return null;

    const extKey = String(target.externalId);
    if (!this.data.serviceOverrides) {
      this.data.serviceOverrides = {};
    }
    const currentOverride = this.data.serviceOverrides[extKey] || {};

    let customRate = updates.customRate !== undefined ? Number(updates.customRate) : target.customRate;
    let markupPercent = updates.markupPercent !== undefined ? Number(updates.markupPercent) : target.markupPercent;
    let isActive = updates.isActive !== undefined ? Boolean(updates.isActive) : target.isActive;

    // If customRate was explicitly provided without markupPercent, compute markupPercent based on originalRate
    if (updates.customRate !== undefined && updates.markupPercent === undefined && target.originalRate > 0) {
      markupPercent = Number((((customRate - target.originalRate) / target.originalRate) * 100).toFixed(2));
    } else if (updates.markupPercent !== undefined && updates.customRate === undefined) {
      customRate = Number((target.originalRate * (1 + markupPercent / 100)).toFixed(4));
    }

    this.data.serviceOverrides[extKey] = {
      ...currentOverride,
      customRate,
      markupPercent,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    target.customRate = customRate;
    target.markupPercent = markupPercent;
    target.isActive = isActive;
    target.updatedAt = new Date().toISOString();

    await this.persist();
    return target;
  }

  public async batchUpdateMarkup(options: {
    markupPercent?: number;
    fixedIncrease?: number;
    platform?: string;
    category?: string;
    serviceIds?: string[];
  }): Promise<{ updatedCount: number }> {
    await this.getServicesAsync();
    const { markupPercent, fixedIncrease, platform, category, serviceIds } = options;
    let count = 0;
    const targetIds = serviceIds && serviceIds.length > 0 ? new Set(serviceIds.map(String)) : null;

    if (!this.data.serviceOverrides) {
      this.data.serviceOverrides = {};
    }

    for (const service of this.inMemoryServices) {
      if (targetIds && !targetIds.has(service.id) && !targetIds.has(service.externalId.toString())) {
        continue;
      }
      if (platform && platform !== 'All' && service.platform.toLowerCase() !== platform.toLowerCase()) {
        continue;
      }
      if (category && category !== 'All' && !service.category.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      const extKey = String(service.externalId);
      const currentOverride = this.data.serviceOverrides[extKey] || {};

      if (markupPercent !== undefined) {
        service.markupPercent = markupPercent;
        service.customRate = Number((service.originalRate * (1 + markupPercent / 100)).toFixed(4));
        this.data.serviceOverrides[extKey] = {
          ...currentOverride,
          markupPercent,
          customRate: service.customRate,
          updatedAt: new Date().toISOString(),
        };
      } else if (fixedIncrease !== undefined) {
        service.customRate = Number((service.originalRate + fixedIncrease).toFixed(4));
        service.markupPercent =
          service.originalRate > 0
            ? Number((((service.customRate - service.originalRate) / service.originalRate) * 100).toFixed(2))
            : 0;
        this.data.serviceOverrides[extKey] = {
          ...currentOverride,
          fixedIncrease,
          customRate: service.customRate,
          markupPercent: service.markupPercent,
          updatedAt: new Date().toISOString(),
        };
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
    await this.getServicesAsync();
    const idSet = new Set(serviceIds.map(String));
    let count = 0;

    if (!this.data.serviceOverrides) {
      this.data.serviceOverrides = {};
    }

    for (const service of this.inMemoryServices) {
      if (idSet.has(service.id) || idSet.has(service.externalId.toString())) {
        service.isActive = isActive;
        service.updatedAt = new Date().toISOString();
        const extKey = String(service.externalId);
        this.data.serviceOverrides[extKey] = {
          ...(this.data.serviceOverrides[extKey] || {}),
          isActive,
          updatedAt: new Date().toISOString(),
        };
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

  private detectRefill(raw: any): boolean {
    if (raw.refill === true || raw.refill === 'true' || raw.refill === 1 || raw.refill === '1') {
      return true;
    }
    const n = `${raw.name || ''} ${raw.category || ''}`.toLowerCase();
    if (
      n.includes('no refill') ||
      n.includes('refill: no') ||
      n.includes('refill : no') ||
      n.includes('without refill') ||
      n.includes('no-refill') ||
      n.includes('refill: none')
    ) {
      return false;
    }
    return (
      n.includes('refill') ||
      n.includes('♻️') ||
      n.includes('30d refill') ||
      n.includes('365d refill') ||
      n.includes('lifetime refill') ||
      n.includes('auto refill') ||
      n.includes('guaranteed refill')
    );
  }

  private detectCancel(raw: any): boolean {
    if (raw.cancel === true || raw.cancel === 'true' || raw.cancel === 1 || raw.cancel === '1') {
      return true;
    }
    const n = `${raw.name || ''} ${raw.category || ''}`.toLowerCase();
    if (
      n.includes('no cancel') ||
      n.includes('cancel: no') ||
      n.includes('cancel : no') ||
      n.includes('without cancel') ||
      n.includes('cancel disabled')
    ) {
      return false;
    }
    return (
      n.includes('cancel: enabled') ||
      n.includes('cancel : enabled') ||
      n.includes('cancel button') ||
      n.includes('cancel: yes') ||
      n.includes('cancel : yes') ||
      n.includes('cancellation: enabled') ||
      n.includes('cancel available') ||
      n.includes('cancel: allowed')
    );
  }

  // ================= ORDERS =================
  public getOrders(): Order[] {
    return [...this.data.orders];
  }

  public getOrdersByUserId(userId: string): Order[] {
    return this.data.orders.filter((o) => o.userId === userId);
  }

  public getUserTotalSpent(userId: string): number {
    const orders = this.getOrdersByUserId(userId);
    const spent = orders
      .filter((o) => o.status !== 'CANCELED')
      .reduce((sum, o) => sum + (o.charge || 0), 0);
    return Number(spent.toFixed(3));
  }

  public getUserTotalOrders(userId: string): number {
    return this.getOrdersByUserId(userId).length;
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const newOrder = await pg.createOrder(orderData);
      this.data.orders.unshift(newOrder);
      return newOrder;
    }

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
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const updated = await pg.updateOrder(id, updates);
      if (updated) {
        const index = this.data.orders.findIndex((o) => o.id === id);
        if (index !== -1) this.data.orders[index] = updated;
      }
      return updated;
    }

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
      } catch {
        // Return null to trigger automatic fallback/re-encryption with active key
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

    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      await pg.setSetting(key, storedValue, encrypt);
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
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      await pg.logAudit(action, details, ip, userId, username);
    }

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


  // ================= TICKETS =================
  public getTickets(): Ticket[] {
    return [...(this.data.tickets || [])];
  }

  public getTicketsByUserId(userId: string): Ticket[] {
    return (this.data.tickets || []).filter((t) => t.userId === userId);
  }

  public async createTicket(ticketData: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
    const pg = PostgresService.getInstance();
    if (pg.isHealthy()) {
      const newTicket = await pg.createTicket(ticketData);
      if (!this.data.tickets) this.data.tickets = [];
      this.data.tickets.unshift(newTicket);
      return newTicket;
    }

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

