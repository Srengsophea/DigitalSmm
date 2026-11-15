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
  Provider,
} from '../models/types';
import { EncryptionService } from './encryption.service';
import { SMMFollowsService } from './smmfollows.service';
import { ProviderService } from './provider.service';
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
  providers?: Record<string, Provider>;
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
        if (!this.data.providers) this.data.providers = {};
        if (!this.data.services) this.data.services = [];
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
      const [users, orders, transactions, tickets, logs, settingsMap] = await Promise.all([
        pg.getAllUsers(),
        pg.getOrders(),
        pg.getTransactions(),
        pg.getTickets(),
        pg.getAuditLogs(),
        pg.getAllSettings(),
      ]);
      this.data.users = users;
      this.data.orders = orders;
      this.data.transactions = transactions;
      this.data.tickets = tickets;
      this.data.auditLogs = logs;

      // Bidirectional sync for settings
      if (Object.keys(settingsMap).length > 0) {
        this.data.settings = settingsMap;
      } else if (this.data.settings && Object.keys(this.data.settings).length > 0) {
        for (const [key, item] of Object.entries(this.data.settings)) {
          await pg.setSetting(key, item.value, item.isEncrypted);
        }
      }

      console.log(`⚡ PostgreSQL Active: ${users.length} users, ${orders.length} orders, ${Object.keys(this.data.settings).length} settings synced.`);
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
      providers: {},
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

    if (!this.data.providers) {
      this.data.providers = {};
    }

    const smmfollowsKey = this.getSettingValue('smmfollows_api_key') || ENV.SMMFOLLOWS_API_KEY;
    const smmfollowsUrl = this.getSettingValue('smmfollows_api_url') || ENV.SMMFOLLOWS_API_URL;

    if (!this.data.providers['smmfollows']) {
      this.data.providers['smmfollows'] = {
        id: 'smmfollows',
        name: 'SMMFollows',
        apiUrl: smmfollowsUrl,
        apiKey: smmfollowsKey,
        status: 'active',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!this.data.providers['smmpwr']) {
      this.data.providers['smmpwr'] = {
        id: 'smmpwr',
        name: 'SMMPWR',
        apiUrl: 'https://smmpwr.com/api/v2',
        apiKey: '63182a0acb6c37b064f338cf2d38e2f8',
        status: 'active',
        isDefault: false,
        createdAt: new Date().toISOString(),
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
      const toPersist: DatabaseSchema = {
        ...this.data,
        services: this.data.services || [],
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
      services: this.data.services || [],
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

  // ================= PROVIDERS =================
  public getProviders(): Provider[] {
    if (!this.data.providers) {
      this.data.providers = {};
    }
    return Object.values(this.data.providers);
  }

  public getProviderById(id: string): Provider | undefined {
    if (!this.data.providers) return undefined;
    const cleanId = id.toLowerCase().trim();
    return this.data.providers[cleanId];
  }

  public async saveProvider(providerData: {
    id?: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    status?: 'active' | 'disabled';
    isDefault?: boolean;
  }): Promise<Provider> {
    if (!this.data.providers) {
      this.data.providers = {};
    }

    const cleanName = providerData.name.trim();
    let id = (providerData.id || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
    if (!id) id = `provider_${Date.now()}`;

    const existing = this.data.providers[id];
    let apiKey = providerData.apiKey;
    if (!apiKey && existing) {
      apiKey = existing.apiKey;
    }

    let cleanApiUrl = providerData.apiUrl.trim().replace(/\/+$/, '');
    if (cleanApiUrl.endsWith('/api')) {
      cleanApiUrl = `${cleanApiUrl}/v2`;
    }

    const provider: Provider = {
      id,
      name: cleanName,
      apiUrl: cleanApiUrl,
      apiKey: apiKey || '',
      status: providerData.status || (existing?.status ?? 'active'),
      isDefault: providerData.isDefault !== undefined ? providerData.isDefault : (existing?.isDefault ?? false),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.providers[id] = provider;
    await this.persist();
    return provider;
  }

  public async deleteProvider(id: string): Promise<boolean> {
    if (!this.data.providers) return false;
    const cleanId = id.toLowerCase().trim();
    if (!this.data.providers[cleanId]) return false;

    // Do not allow deleting the last remaining provider
    if (Object.keys(this.data.providers).length <= 1) {
      throw new Error('Cannot delete the last remaining provider');
    }

    delete this.data.providers[cleanId];
    await this.persist();
    return true;
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
   * Asynchronously fetch services dynamically from database or provider with caching
   */
  public async getServicesAsync(forceRefresh = false): Promise<ServiceItem[]> {
    if (this.data.services && this.data.services.length > 0 && !forceRefresh) {
      this.inMemoryServices = [...this.data.services];
      return [...this.inMemoryServices];
    }

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
        if (this.data.services && this.data.services.length > 0) {
          this.inMemoryServices = [...this.data.services];
          this.lastServiceFetchTime = Date.now();
          return [...this.inMemoryServices];
        }

        const smm = SMMFollowsService.getInstance();
        const rawServices = await smm.getServices();
        if (Array.isArray(rawServices) && rawServices.length > 0) {
          this.data.services = this.transformRawServices(rawServices, 'smmfollows');
          this.inMemoryServices = [...this.data.services];
          this.lastServiceFetchTime = Date.now();
          await this.persist();
          console.log(`✅ Loaded ${this.inMemoryServices.length} live services into database`);
        }
        return [...this.inMemoryServices];
      } catch (err: any) {
        console.error('Failed to fetch services:', err.message);
        if (this.data.services && this.data.services.length > 0) {
          this.inMemoryServices = [...this.data.services];
          return [...this.inMemoryServices];
        }
        if (this.inMemoryServices.length > 0) {
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
    return services.find(
      (s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`)
    );
  }

  public async getServiceByExternalIdAsync(externalId: number, providerId?: string): Promise<ServiceItem | undefined> {
    const services = await this.getServicesAsync();
    if (providerId) {
      return services.find((s) => s.externalId === externalId && (s.provider || 'smmfollows') === providerId);
    }
    return services.find((s) => s.externalId === externalId);
  }

  public getServiceById(id: string): ServiceItem | undefined {
    const numId = Number(id);
    return this.inMemoryServices.find(
      (s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`)
    );
  }

  public getServiceByExternalId(externalId: number, providerId?: string): ServiceItem | undefined {
    if (providerId) {
      return this.inMemoryServices.find((s) => s.externalId === externalId && (s.provider || 'smmfollows') === providerId);
    }
    return this.inMemoryServices.find((s) => s.externalId === externalId);
  }

  /**
   * Transform raw catalog items into full DigitalSMM ServiceItem objects
   */
  private transformRawServices(rawServices: any[], providerId: string = 'smmfollows'): ServiceItem[] {
    const defaultMarkup = Number(this.getSettingValue('default_markup_percent') || '30');
    const overrides = this.data.serviceOverrides || {};
    const items: ServiceItem[] = [];

    for (const raw of rawServices) {
      const externalId = Number(raw.service);
      if (isNaN(externalId)) continue;

      const originalRate = parseFloat(raw.rate || '0');
      const extKey = `${providerId}_${externalId}`;
      const legacyKey = String(externalId);
      const override = overrides[extKey] || overrides[legacyKey];

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
        id: `${providerId}_${externalId}`,
        externalId,
        provider: providerId,
        name: raw.name || `Service #${externalId}`,
        category: raw.category || 'General',
        platform,
        originalRate,
        customRate,
        markupPercent,
        min: parseInt(String(raw.min || '10'), 10),
        max: parseInt(String(raw.max || '10000'), 10),
        type: raw.type || 'Default',
        isActive,
        dripfeed: Boolean(raw.dripfeed),
        refill: override?.refill !== undefined ? Boolean(override.refill) : this.detectRefill(raw),
        cancel: override?.cancel !== undefined ? Boolean(override.cancel) : this.detectCancel(raw),
        description: raw.desc || raw.description || raw.details || raw.info || raw.service_description || '',
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

  public async importServicesFromProvider(options: {
    providerId: string;
    mode: 'all' | 'category' | 'selected' | 'single';
    category?: string;
    serviceIds?: (number | string)[];
    markupPercent?: number;
    fixedIncrease?: number;
    isActive?: boolean;
  }): Promise<{ importedCount: number; updatedCount: number; totalCount: number }> {
    await this.getServicesAsync();
    const providerService = ProviderService.getInstance();
    const rawServices = await providerService.getServices(options.providerId);

    if (!Array.isArray(rawServices) || rawServices.length === 0) {
      throw new Error(`No services returned from provider "${options.providerId}"`);
    }

    const defaultMarkup = options.markupPercent !== undefined
      ? options.markupPercent
      : Number(this.getSettingValue('default_markup_percent') || '30');

    let filtered = rawServices;
    if (options.mode === 'category' && options.category && options.category !== 'All') {
      const catTarget = options.category.toLowerCase().trim();
      filtered = rawServices.filter(
        (r) => (r.category || '').toLowerCase().trim() === catTarget
      );
    } else if ((options.mode === 'selected' || options.mode === 'single') && options.serviceIds && options.serviceIds.length > 0) {
      const idSet = new Set(options.serviceIds.map(String));
      filtered = rawServices.filter((r) => idSet.has(String(r.service)));
    }

    if (filtered.length === 0) {
      throw new Error('No matching services found to import with specified criteria');
    }

    if (!this.data.services) {
      this.data.services = [];
    }

    let importedCount = 0;
    let updatedCount = 0;

    for (const raw of filtered) {
      const externalId = Number(raw.service);
      if (isNaN(externalId)) continue;

      const originalRate = parseFloat(raw.rate || '0');
      let customRate: number;
      let markupPercent = defaultMarkup;

      if (options.fixedIncrease !== undefined && options.fixedIncrease > 0) {
        customRate = Number((originalRate + options.fixedIncrease).toFixed(4));
        markupPercent = originalRate > 0
          ? Number((((customRate - originalRate) / originalRate) * 100).toFixed(2))
          : 0;
      } else {
        customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
      }

      const platform = this.detectPlatform(raw.category, raw.name);
      const serviceUid = `${options.providerId}_${externalId}`;

      const existingIdx = this.data.services.findIndex(
        (s) => (s.provider === options.providerId && s.externalId === externalId) || s.id === serviceUid
      );

      const item: ServiceItem = {
        id: serviceUid,
        externalId,
        provider: options.providerId,
        name: raw.name || `Service #${externalId}`,
        category: raw.category || 'General',
        platform,
        originalRate,
        customRate,
        markupPercent,
        min: parseInt(String(raw.min || '10'), 10),
        max: parseInt(String(raw.max || '10000'), 10),
        type: raw.type || 'Default',
        isActive: options.isActive !== undefined ? options.isActive : true,
        dripfeed: Boolean(raw.dripfeed),
        refill: this.detectRefill(raw),
        cancel: this.detectCancel(raw),
        description: raw.desc || raw.description || raw.details || raw.info || raw.service_description || '',
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        this.data.services[existingIdx] = {
          ...this.data.services[existingIdx],
          ...item,
        };
        updatedCount++;
      } else {
        this.data.services.push(item);
        importedCount++;
      }
    }

    this.inMemoryServices = [...this.data.services];
    this.lastServiceFetchTime = Date.now();
    await this.persist();

    return {
      importedCount,
      updatedCount,
      totalCount: this.data.services.length,
    };
  }

  public async deleteService(id: string): Promise<boolean> {
    await this.getServicesAsync();
    if (!this.data.services) this.data.services = [];
    const numId = Number(id);
    const initialLen = this.data.services.length;
    this.data.services = this.data.services.filter(
      (s) => s.id !== id && (!isNaN(numId) ? s.externalId !== numId : true) && !s.id.endsWith(`_${id}`)
    );
    this.inMemoryServices = [...this.data.services];
    if (this.data.services.length !== initialLen) {
      await this.persist();
      return true;
    }
    return false;
  }

  public async bulkDeleteServices(ids: string[]): Promise<number> {
    await this.getServicesAsync();
    if (!this.data.services) this.data.services = [];
    const idSet = new Set(ids.map(String));
    const initialLen = this.data.services.length;
    this.data.services = this.data.services.filter(
      (s) => !idSet.has(s.id) && !idSet.has(String(s.externalId))
    );
    const deletedCount = initialLen - this.data.services.length;
    this.inMemoryServices = [...this.data.services];
    if (deletedCount > 0) {
      await this.persist();
    }
    return deletedCount;
  }

  public async updateService(id: string, updates: Partial<ServiceItem>): Promise<ServiceItem | null> {
    await this.getServicesAsync();
    const numId = Number(id);
    const target = this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`));
    if (!target) return null;

    const extKey = target.id;
    const legacyKey = String(target.externalId);
    if (!this.data.serviceOverrides) {
      this.data.serviceOverrides = {};
    }
    const currentOverride = this.data.serviceOverrides[extKey] || this.data.serviceOverrides[legacyKey] || {};

    let customRate = updates.customRate !== undefined ? Number(updates.customRate) : target.customRate;
    let markupPercent = updates.markupPercent !== undefined ? Number(updates.markupPercent) : target.markupPercent;
    let isActive = updates.isActive !== undefined ? Boolean(updates.isActive) : target.isActive;

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

    if (this.data.services) {
      const dbItem = this.data.services.find(s => s.id === target.id);
      if (dbItem) {
        dbItem.customRate = customRate;
        dbItem.markupPercent = markupPercent;
        dbItem.isActive = isActive;
        dbItem.updatedAt = new Date().toISOString();
      }
    }

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

