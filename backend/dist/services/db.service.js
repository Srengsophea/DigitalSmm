"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const encryption_service_1 = require("./encryption.service");
const smmfollows_service_1 = require("./smmfollows.service");
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
                // Ensure services is empty in this.data; services live in memory from SMMFollows
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
        // Asynchronously preload live services directly from SMMFollows after init finishes
        setImmediate(() => {
            this.getServicesAsync().catch((err) => {
                console.warn('Initial SMMFollows services fetch warning:', err.message);
            });
        });
    }
    seedDefaults() {
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
    ensureAdminUser() {
        const existingAdmin = this.data.users.find((u) => u.email.toLowerCase() === env_1.ENV.ADMIN_EMAIL.toLowerCase());
        if (!existingAdmin) {
            const salt = bcryptjs_1.default.genSaltSync(12);
            const passwordHash = bcryptjs_1.default.hashSync(env_1.ENV.ADMIN_PASSWORD, salt);
            const adminUser = {
                id: crypto_1.default.randomUUID(),
                username: 'admin',
                email: env_1.ENV.ADMIN_EMAIL.toLowerCase(),
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
            console.log('✅ Admin User initialized successfully');
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
        this.persistSync();
    }
    /**
     * Thread-safe atomic file persistence with Windows file-lock fallback
     */
    async persist() {
        this.writeLock = this.writeLock.then(async () => {
            const tempPath = `${this.filePath}.tmp.${Date.now()}`;
            // Never store raw services in the JSON file; services are fetched live from SMMFollows
            const toPersist = {
                ...this.data,
                services: [],
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
            services: [],
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
        return this.data.users.find((u) => u.apiKey === apiKey);
    }
    async createUser(user) {
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
     * Asynchronously fetch services dynamically from SMMFollows with in-memory TTL caching
     */
    async getServicesAsync(forceRefresh = false) {
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
                const smm = smmfollows_service_1.SMMFollowsService.getInstance();
                const rawServices = await smm.getServices();
                if (Array.isArray(rawServices) && rawServices.length > 0) {
                    this.inMemoryServices = this.transformRawServices(rawServices);
                    this.lastServiceFetchTime = Date.now();
                    console.log(`✅ Loaded ${this.inMemoryServices.length} live services from SMMFollows`);
                }
                return [...this.inMemoryServices];
            }
            catch (err) {
                console.error('Failed to fetch services from SMMFollows:', err.message);
                if (this.inMemoryServices.length > 0) {
                    console.log('Serving from existing in-memory cache as fallback');
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
        return services.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
    }
    async getServiceByExternalIdAsync(externalId) {
        const services = await this.getServicesAsync();
        return services.find((s) => s.externalId === externalId);
    }
    getServiceById(id) {
        const numId = Number(id);
        return this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
    }
    getServiceByExternalId(externalId) {
        return this.inMemoryServices.find((s) => s.externalId === externalId);
    }
    /**
     * Transform raw SMMFollows catalog items into full DigitalSMM ServiceItem objects,
     * applying default markup and individual admin service overrides.
     */
    transformRawServices(rawServices) {
        const defaultMarkup = Number(this.getSettingValue('default_markup_percent') || '30');
        const overrides = this.data.serviceOverrides || {};
        const items = [];
        for (const raw of rawServices) {
            const externalId = Number(raw.service);
            if (isNaN(externalId))
                continue;
            const originalRate = parseFloat(raw.rate || '0');
            const extKey = String(externalId);
            const override = overrides[extKey];
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
                refill: Boolean(raw.refill),
                cancel: Boolean(raw.cancel),
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
    async updateService(id, updates) {
        await this.getServicesAsync();
        const numId = Number(id);
        const target = this.inMemoryServices.find((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
        if (!target)
            return null;
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
    // ================= ORDERS =================
    getOrders() {
        return [...this.data.orders];
    }
    getOrdersByUserId(userId) {
        return this.data.orders.filter((o) => o.userId === userId);
    }
    getOrderById(id) {
        return this.data.orders.find((o) => o.id === id);
    }
    async createOrder(orderData) {
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
            catch (err) {
                console.error(`Failed to decrypt setting ${key}:`, err);
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
