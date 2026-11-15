"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
exports.toSafeUser = toSafeUser;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const encryption_service_1 = require("./encryption.service");
const smmfollows_service_1 = require("./smmfollows.service");
const provider_service_1 = require("./provider.service");
const postgres_service_1 = require("./postgres.service");
/**
 * Strips password hashes, TOTP secrets, and internal security counters before sending user data over wire.
 */
function toSafeUser(user, totalSpent, totalOrders) {
    const { passwordHash: _, twoFactorSecret: __, failedLoginAttempts: ___, lockoutUntil: ____, ...safe } = user;
    let spent = totalSpent;
    let ordersCount = totalOrders;
    if (spent === undefined || ordersCount === undefined) {
        try {
            const db = DatabaseService.getInstance();
            if (spent === undefined)
                spent = db.getUserTotalSpent(user.id);
            if (ordersCount === undefined)
                ordersCount = db.getUserTotalOrders(user.id);
        }
        catch {
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
class DatabaseService {
    static instance;
    filePath;
    data;
    inMemoryServices = [];
    lastServiceFetchTime = 0;
    serviceFetchPromise = null;
    static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
    writeLock = Promise.resolve();
    constructor() {
        DatabaseService.instance = this;
        this.filePath = path_1.default.join(env_1.ENV.DATA_DIR, 'digitalsmm.json');
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
    static getInstance() {
        if (!DatabaseService.instance) {
            new DatabaseService();
        }
        return DatabaseService.instance;
    }
    init() {
        if (!fs_1.default.existsSync(env_1.ENV.DATA_DIR)) {
            fs_1.default.mkdirSync(env_1.ENV.DATA_DIR, { recursive: true });
        }
        if (fs_1.default.existsSync(this.filePath)) {
            try {
                const raw = fs_1.default.readFileSync(this.filePath, 'utf8');
                this.data = JSON.parse(raw);
                if (!this.data.tickets)
                    this.data.tickets = [];
                if (!this.data.serviceOverrides)
                    this.data.serviceOverrides = {};
                if (!this.data.providers)
                    this.data.providers = {};
                if (!this.data.services)
                    this.data.services = [];
            }
            catch (err) {
                console.error('Error loading database file, initializing clean DB:', err);
                this.seedDefaults();
            }
        }
        else {
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
    async initPostgres() {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isEnabled()) {
            const ok = await pg.init();
            if (ok) {
                await this.hydrateFromPostgres();
            }
        }
    }
    async hydrateFromPostgres() {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (!pg.isHealthy())
            return;
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
            }
            else if (this.data.settings && Object.keys(this.data.settings).length > 0) {
                for (const [key, item] of Object.entries(this.data.settings)) {
                    await pg.setSetting(key, item.value, item.isEncrypted);
                }
            }
            console.log(`⚡ PostgreSQL Active: ${users.length} users, ${orders.length} orders, ${Object.keys(this.data.settings).length} settings synced.`);
        }
        catch (err) {
            console.warn('Could not hydrate in-memory cache from PostgreSQL:', err.message);
        }
    }
    seedDefaults() {
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
    ensureAdminUser() {
        const targetEmail = env_1.ENV.ADMIN_EMAIL.toLowerCase();
        const existingAdmin = this.data.users.find((u) => u.email.toLowerCase() === targetEmail);
        if (!existingAdmin) {
            const salt = bcryptjs_1.default.genSaltSync(12);
            const passwordHash = bcryptjs_1.default.hashSync(env_1.ENV.ADMIN_PASSWORD, salt);
            const adminUser = {
                id: crypto_1.default.randomUUID(),
                username: 'admin',
                email: targetEmail,
                passwordHash,
                balance: 1000.0,
                role: 'ADMIN',
                status: 'active',
                apiKey: encryption_service_1.EncryptionService.generateApiKey('ds_adm_'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.data.users.push(adminUser);
            this.persistSync();
            console.log(`✅ Admin User (${targetEmail}) initialized successfully`);
        }
        else {
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
            if (env_1.ENV.ADMIN_PASSWORD && !bcryptjs_1.default.compareSync(env_1.ENV.ADMIN_PASSWORD, existingAdmin.passwordHash)) {
                const salt = bcryptjs_1.default.genSaltSync(12);
                existingAdmin.passwordHash = bcryptjs_1.default.hashSync(env_1.ENV.ADMIN_PASSWORD, salt);
                changed = true;
            }
            if (changed) {
                existingAdmin.updatedAt = new Date().toISOString();
                this.persistSync();
                console.log(`✅ Admin User (${targetEmail}) synchronized with role: ADMIN and updated credentials`);
            }
        }
        // Also unlock default admin@digitalsmm.com if locked
        const defaultAdmin = this.data.users.find((u) => u.email.toLowerCase() === 'admin@digitalsmm.com');
        if (defaultAdmin && (defaultAdmin.failedLoginAttempts || defaultAdmin.lockoutUntil)) {
            defaultAdmin.failedLoginAttempts = 0;
            delete defaultAdmin.lockoutUntil;
            this.persistSync();
        }
    }
    ensureProviderSettings() {
        const existingKey = this.getSettingValue('smmfollows_api_key');
        // If setting doesn't exist or was double-encrypted with a colon
        if (!existingKey || existingKey.includes(':')) {
            const encryptedKey = encryption_service_1.EncryptionService.encryptToString(env_1.ENV.SMMFOLLOWS_API_KEY);
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
                value: env_1.ENV.SMMFOLLOWS_API_URL,
                isEncrypted: false,
                updatedAt: new Date().toISOString(),
            };
        }
        if (!this.data.settings['default_markup_percent']) {
            this.data.settings['default_markup_percent'] = {
                key: 'default_markup_percent',
                value: env_1.ENV.DEFAULT_MARKUP_PERCENT.toString(),
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
                value: env_1.ENV.BAKONG_ACCOUNT_ID,
                isEncrypted: false,
                updatedAt: new Date().toISOString(),
            };
        }
        if (!this.data.settings['bakong_merchant_name']) {
            this.data.settings['bakong_merchant_name'] = {
                key: 'bakong_merchant_name',
                value: env_1.ENV.BAKONG_MERCHANT_NAME,
                isEncrypted: false,
                updatedAt: new Date().toISOString(),
            };
        }
        if (!this.data.settings['bakong_merchant_city']) {
            this.data.settings['bakong_merchant_city'] = {
                key: 'bakong_merchant_city',
                value: env_1.ENV.BAKONG_MERCHANT_CITY,
                isEncrypted: false,
                updatedAt: new Date().toISOString(),
            };
        }
        if (!this.data.providers) {
            this.data.providers = {};
        }
        const smmfollowsKey = this.getSettingValue('smmfollows_api_key') || env_1.ENV.SMMFOLLOWS_API_KEY;
        const smmfollowsUrl = this.getSettingValue('smmfollows_api_url') || env_1.ENV.SMMFOLLOWS_API_URL;
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
    async persist() {
        this.writeLock = this.writeLock.then(async () => {
            const tempPath = `${this.filePath}.tmp.${Date.now()}`;
            const toPersist = {
                ...this.data,
                services: this.data.services || [],
            };
            const jsonContent = JSON.stringify(toPersist, null, 2);
            try {
                await fs_1.default.promises.writeFile(tempPath, jsonContent, 'utf8');
                try {
                    await fs_1.default.promises.rename(tempPath, this.filePath);
                }
                catch (renameErr) {
                    // Fallback for Windows file-locking / EPERM
                    await fs_1.default.promises.copyFile(tempPath, this.filePath);
                    await fs_1.default.promises.unlink(tempPath).catch(() => { });
                }
            }
            catch (err) {
                console.error('Error persisting database:', err);
            }
        });
        return this.writeLock;
    }
    persistSync() {
        const tempPath = `${this.filePath}.tmp.${Date.now()}`;
        const toPersist = {
            ...this.data,
            services: this.data.services || [],
        };
        const jsonContent = JSON.stringify(toPersist, null, 2);
        try {
            fs_1.default.writeFileSync(tempPath, jsonContent, 'utf8');
            try {
                fs_1.default.renameSync(tempPath, this.filePath);
            }
            catch (err) {
                fs_1.default.copyFileSync(tempPath, this.filePath);
                try {
                    fs_1.default.unlinkSync(tempPath);
                }
                catch (_) { }
            }
        }
        catch (writeErr) {
            fs_1.default.writeFileSync(this.filePath, jsonContent, 'utf8');
        }
    }
    // ================= PROVIDERS =================
    getProviders() {
        if (!this.data.providers) {
            this.data.providers = {};
        }
        return Object.values(this.data.providers);
    }
    getProviderById(id) {
        if (!this.data.providers)
            return undefined;
        const cleanId = id.toLowerCase().trim();
        return this.data.providers[cleanId];
    }
    async saveProvider(providerData) {
        if (!this.data.providers) {
            this.data.providers = {};
        }
        const cleanName = providerData.name.trim();
        let id = (providerData.id || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
        if (!id)
            id = `provider_${Date.now()}`;
        const existing = this.data.providers[id];
        let apiKey = providerData.apiKey;
        if (!apiKey && existing) {
            apiKey = existing.apiKey;
        }
        let cleanApiUrl = providerData.apiUrl.trim().replace(/\/+$/, '');
        if (cleanApiUrl.endsWith('/api')) {
            cleanApiUrl = `${cleanApiUrl}/v2`;
        }
        const provider = {
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
    async deleteProvider(id) {
        if (!this.data.providers)
            return false;
        const cleanId = id.toLowerCase().trim();
        if (!this.data.providers[cleanId])
            return false;
        // Do not allow deleting the last remaining provider
        if (Object.keys(this.data.providers).length <= 1) {
            throw new Error('Cannot delete the last remaining provider');
        }
        delete this.data.providers[cleanId];
        await this.persist();
        return true;
    }
    // ================= USERS =================
    getUsers() {
        return [...this.data.users];
    }
    getUserById(id) {
        return this.data.users.find((u) => u.id === id);
    }
    getUserByEmail(email) {
        return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }
    getUserByUsername(username) {
        return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    }
    getUserByApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string')
            return undefined;
        const targetBuffer = Buffer.from(apiKey);
        return this.data.users.find((u) => {
            if (!u.apiKey)
                return false;
            const userKeyBuffer = Buffer.from(u.apiKey);
            if (userKeyBuffer.length !== targetBuffer.length)
                return false;
            return crypto_1.default.timingSafeEqual(userKeyBuffer, targetBuffer);
        });
    }
    async createUser(user) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            const newUser = await pg.createUser(user);
            this.data.users.push(newUser);
            return newUser;
        }
        const newUser = {
            ...user,
            id: crypto_1.default.randomUUID(),
            apiKey: encryption_service_1.EncryptionService.generateApiKey('ds_usr_'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.data.users.push(newUser);
        await this.persist();
        return newUser;
    }
    async updateUser(id, updates) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            const updated = await pg.updateUser(id, updates);
            if (updated) {
                const index = this.data.users.findIndex((u) => u.id === id);
                if (index !== -1)
                    this.data.users[index] = updated;
            }
            return updated;
        }
        const index = this.data.users.findIndex((u) => u.id === id);
        if (index === -1)
            return null;
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
    async adjustUserBalance(userId, amount, type, referenceId, description) {
        const pg = postgres_service_1.PostgresService.getInstance();
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
        const transaction = {
            id: crypto_1.default.randomUUID(),
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
    async getServicesAsync(forceRefresh = false) {
        if (this.data.services && this.data.services.length > 0 && !forceRefresh) {
            this.inMemoryServices = [...this.data.services];
            return [...this.inMemoryServices];
        }
        const isCacheValid = !forceRefresh &&
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
                const smm = smmfollows_service_1.SMMFollowsService.getInstance();
                const rawServices = await smm.getServices();
                if (Array.isArray(rawServices) && rawServices.length > 0) {
                    this.data.services = this.transformRawServices(rawServices, 'smmfollows');
                    this.inMemoryServices = [...this.data.services];
                    this.lastServiceFetchTime = Date.now();
                    await this.persist();
                    console.log(`✅ Loaded ${this.inMemoryServices.length} live services into database`);
                }
                return [...this.inMemoryServices];
            }
            catch (err) {
                console.error('Failed to fetch services:', err.message);
                if (this.data.services && this.data.services.length > 0) {
                    this.inMemoryServices = [...this.data.services];
                    return [...this.inMemoryServices];
                }
                if (this.inMemoryServices.length > 0) {
                    return [...this.inMemoryServices];
                }
                return [];
            }
            finally {
                this.serviceFetchPromise = null;
            }
        })();
        return this.serviceFetchPromise;
    }
    /**
     * Synchronous getter for in-memory services
     */
    getServices() {
        return [...this.inMemoryServices];
    }
    async getServiceByIdAsync(id) {
        const services = await this.getServicesAsync();
        const numId = Number(id);
        return services.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`));
    }
    async getServiceByExternalIdAsync(externalId, providerId) {
        const services = await this.getServicesAsync();
        if (providerId) {
            return services.find((s) => s.externalId === externalId && (s.provider || 'smmfollows') === providerId);
        }
        return services.find((s) => s.externalId === externalId);
    }
    getServiceById(id) {
        const numId = Number(id);
        return this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`));
    }
    getServiceByExternalId(externalId, providerId) {
        if (providerId) {
            return this.inMemoryServices.find((s) => s.externalId === externalId && (s.provider || 'smmfollows') === providerId);
        }
        return this.inMemoryServices.find((s) => s.externalId === externalId);
    }
    /**
     * Transform raw catalog items into full DigitalSMM ServiceItem objects
     */
    transformRawServices(rawServices, providerId = 'smmfollows') {
        const defaultMarkup = Number(this.getSettingValue('default_markup_percent') || '30');
        const overrides = this.data.serviceOverrides || {};
        const items = [];
        for (const raw of rawServices) {
            const externalId = Number(raw.service);
            if (isNaN(externalId))
                continue;
            const originalRate = parseFloat(raw.rate || '0');
            const extKey = `${providerId}_${externalId}`;
            const legacyKey = String(externalId);
            const override = overrides[extKey] || overrides[legacyKey];
            let customRate;
            let markupPercent;
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
                }
                else if (override.markupPercent !== undefined) {
                    markupPercent = Number(override.markupPercent);
                    customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
                }
                else if (override.fixedIncrease !== undefined) {
                    customRate = Number((originalRate + override.fixedIncrease).toFixed(4));
                    markupPercent =
                        originalRate > 0
                            ? Number((((customRate - originalRate) / originalRate) * 100).toFixed(2))
                            : 0;
                }
                else {
                    markupPercent = defaultMarkup;
                    customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
                }
            }
            else {
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
    async upsertServices(rawServices, markupPercent) {
        if (markupPercent !== undefined && !isNaN(markupPercent)) {
            await this.setSetting('default_markup_percent', markupPercent.toString(), false);
        }
        if (Array.isArray(rawServices) && rawServices.length > 0) {
            this.inMemoryServices = this.transformRawServices(rawServices);
            this.lastServiceFetchTime = Date.now();
        }
        return { count: this.inMemoryServices.length };
    }
    async importServicesFromProvider(options) {
        await this.getServicesAsync();
        const providerService = provider_service_1.ProviderService.getInstance();
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
            filtered = rawServices.filter((r) => (r.category || '').toLowerCase().trim() === catTarget);
        }
        else if ((options.mode === 'selected' || options.mode === 'single') && options.serviceIds && options.serviceIds.length > 0) {
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
            if (isNaN(externalId))
                continue;
            const originalRate = parseFloat(raw.rate || '0');
            let customRate;
            let markupPercent = defaultMarkup;
            if (options.fixedIncrease !== undefined && options.fixedIncrease > 0) {
                customRate = Number((originalRate + options.fixedIncrease).toFixed(4));
                markupPercent = originalRate > 0
                    ? Number((((customRate - originalRate) / originalRate) * 100).toFixed(2))
                    : 0;
            }
            else {
                customRate = Number((originalRate * (1 + markupPercent / 100)).toFixed(4));
            }
            const platform = this.detectPlatform(raw.category, raw.name);
            const serviceUid = `${options.providerId}_${externalId}`;
            const existingIdx = this.data.services.findIndex((s) => (s.provider === options.providerId && s.externalId === externalId) || s.id === serviceUid);
            const item = {
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
            }
            else {
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
    async deleteService(id) {
        await this.getServicesAsync();
        if (!this.data.services)
            this.data.services = [];
        const numId = Number(id);
        const initialLen = this.data.services.length;
        this.data.services = this.data.services.filter((s) => s.id !== id && (!isNaN(numId) ? s.externalId !== numId : true) && !s.id.endsWith(`_${id}`));
        this.inMemoryServices = [...this.data.services];
        if (this.data.services.length !== initialLen) {
            await this.persist();
            return true;
        }
        return false;
    }
    async bulkDeleteServices(ids) {
        await this.getServicesAsync();
        if (!this.data.services)
            this.data.services = [];
        const idSet = new Set(ids.map(String));
        const initialLen = this.data.services.length;
        this.data.services = this.data.services.filter((s) => !idSet.has(s.id) && !idSet.has(String(s.externalId)));
        const deletedCount = initialLen - this.data.services.length;
        this.inMemoryServices = [...this.data.services];
        if (deletedCount > 0) {
            await this.persist();
        }
        return deletedCount;
    }
    async updateService(id, updates) {
        await this.getServicesAsync();
        const numId = Number(id);
        const target = this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId) || s.id.endsWith(`_${id}`));
        if (!target)
            return null;
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
        }
        else if (updates.markupPercent !== undefined && updates.customRate === undefined) {
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
    async batchUpdateMarkup(options) {
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
            }
            else if (fixedIncrease !== undefined) {
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
    async bulkUpdateStatus(serviceIds, isActive) {
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
    detectPlatform(category = '', name = '') {
        const combined = `${category} ${name}`.toLowerCase();
        if (combined.includes('instagram') || combined.includes('ig '))
            return 'Instagram';
        if (combined.includes('tiktok') || combined.includes('tik tok'))
            return 'TikTok';
        if (combined.includes('youtube') || combined.includes('yt '))
            return 'YouTube';
        if (combined.includes('telegram') || combined.includes('tg '))
            return 'Telegram';
        if (combined.includes('twitter') || combined.includes('x.com') || combined.includes('tweet'))
            return 'Twitter';
        if (combined.includes('facebook') || combined.includes('fb '))
            return 'Facebook';
        if (combined.includes('spotify'))
            return 'Spotify';
        if (combined.includes('discord'))
            return 'Discord';
        if (combined.includes('twitch'))
            return 'Twitch';
        if (combined.includes('linkedin'))
            return 'LinkedIn';
        if (combined.includes('threads'))
            return 'Threads';
        return 'Other';
    }
    detectRefill(raw) {
        if (raw.refill === true || raw.refill === 'true' || raw.refill === 1 || raw.refill === '1') {
            return true;
        }
        const n = `${raw.name || ''} ${raw.category || ''}`.toLowerCase();
        if (n.includes('no refill') ||
            n.includes('refill: no') ||
            n.includes('refill : no') ||
            n.includes('without refill') ||
            n.includes('no-refill') ||
            n.includes('refill: none')) {
            return false;
        }
        return (n.includes('refill') ||
            n.includes('♻️') ||
            n.includes('30d refill') ||
            n.includes('365d refill') ||
            n.includes('lifetime refill') ||
            n.includes('auto refill') ||
            n.includes('guaranteed refill'));
    }
    detectCancel(raw) {
        if (raw.cancel === true || raw.cancel === 'true' || raw.cancel === 1 || raw.cancel === '1') {
            return true;
        }
        const n = `${raw.name || ''} ${raw.category || ''}`.toLowerCase();
        if (n.includes('no cancel') ||
            n.includes('cancel: no') ||
            n.includes('cancel : no') ||
            n.includes('without cancel') ||
            n.includes('cancel disabled')) {
            return false;
        }
        return (n.includes('cancel: enabled') ||
            n.includes('cancel : enabled') ||
            n.includes('cancel button') ||
            n.includes('cancel: yes') ||
            n.includes('cancel : yes') ||
            n.includes('cancellation: enabled') ||
            n.includes('cancel available') ||
            n.includes('cancel: allowed'));
    }
    // ================= ORDERS =================
    getOrders() {
        return [...this.data.orders];
    }
    getOrdersByUserId(userId) {
        return this.data.orders.filter((o) => o.userId === userId);
    }
    getUserTotalSpent(userId) {
        const orders = this.getOrdersByUserId(userId);
        const spent = orders
            .filter((o) => o.status !== 'CANCELED')
            .reduce((sum, o) => sum + (o.charge || 0), 0);
        return Number(spent.toFixed(3));
    }
    getUserTotalOrders(userId) {
        return this.getOrdersByUserId(userId).length;
    }
    getOrderById(id) {
        return this.data.orders.find((o) => o.id === id);
    }
    async createOrder(orderData) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            const newOrder = await pg.createOrder(orderData);
            this.data.orders.unshift(newOrder);
            return newOrder;
        }
        const newOrder = {
            ...orderData,
            id: crypto_1.default.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.data.orders.unshift(newOrder);
        await this.persist();
        return newOrder;
    }
    async updateOrder(id, updates) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            const updated = await pg.updateOrder(id, updates);
            if (updated) {
                const index = this.data.orders.findIndex((o) => o.id === id);
                if (index !== -1)
                    this.data.orders[index] = updated;
            }
            return updated;
        }
        const index = this.data.orders.findIndex((o) => o.id === id);
        if (index === -1)
            return null;
        this.data.orders[index] = {
            ...this.data.orders[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.persist();
        return this.data.orders[index];
    }
    // ================= TRANSACTIONS =================
    getTransactions() {
        return [...this.data.transactions];
    }
    getTransactionsByUserId(userId) {
        return this.data.transactions.filter((t) => t.userId === userId);
    }
    // ================= SETTINGS =================
    getSetting(key) {
        return this.data.settings[key];
    }
    getSettingValue(key) {
        const item = this.data.settings[key];
        if (!item)
            return null;
        if (item.isEncrypted) {
            try {
                return encryption_service_1.EncryptionService.decryptFromString(item.value);
            }
            catch {
                // Return null to trigger automatic fallback/re-encryption with active key
                return null;
            }
        }
        return item.value;
    }
    async setSetting(key, value, encrypt = false) {
        let storedValue = value;
        if (encrypt) {
            storedValue = encryption_service_1.EncryptionService.encryptToString(value);
        }
        const pg = postgres_service_1.PostgresService.getInstance();
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
    async logAudit(action, details, ip, userId, username) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            await pg.logAudit(action, details, ip, userId, username);
        }
        const log = {
            id: crypto_1.default.randomUUID(),
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
    getAuditLogs() {
        return [...this.data.auditLogs];
    }
    // ================= TICKETS =================
    getTickets() {
        return [...(this.data.tickets || [])];
    }
    getTicketsByUserId(userId) {
        return (this.data.tickets || []).filter((t) => t.userId === userId);
    }
    async createTicket(ticketData) {
        const pg = postgres_service_1.PostgresService.getInstance();
        if (pg.isHealthy()) {
            const newTicket = await pg.createTicket(ticketData);
            if (!this.data.tickets)
                this.data.tickets = [];
            this.data.tickets.unshift(newTicket);
            return newTicket;
        }
        const maxNum = (this.data.tickets || []).reduce((max, t) => Math.max(max, t.ticketNumber || 0), 1172280);
        const newTicket = {
            ...ticketData,
            id: crypto_1.default.randomUUID(),
            ticketNumber: maxNum + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (!this.data.tickets)
            this.data.tickets = [];
        this.data.tickets.unshift(newTicket);
        await this.persist();
        return newTicket;
    }
}
exports.DatabaseService = DatabaseService;
