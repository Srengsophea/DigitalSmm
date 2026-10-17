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
class DatabaseService {
    static instance;
    filePath;
    data;
    writeLock = Promise.resolve();
    constructor() {
        this.filePath = path_1.default.join(env_1.ENV.DATA_DIR, 'digitalsmm.json');
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
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
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
        this.ensureWelcomeTicket();
    }
    seedDefaults() {
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
            // Also create a demo regular user
            const demoUserHash = bcryptjs_1.default.hashSync('User@DigitalSMM2026!', salt);
            const demoUser = {
                id: crypto_1.default.randomUUID(),
                username: 'demouser',
                email: 'user@digitalsmm.com',
                passwordHash: demoUserHash,
                balance: 100.0,
                role: 'USER',
                status: 'active',
                apiKey: encryption_service_1.EncryptionService.generateApiKey('ds_usr_'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.data.users.push(demoUser);
            this.data.transactions.push({
                id: crypto_1.default.randomUUID(),
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
        this.persistSync();
    }
    /**
     * Thread-safe atomic file persistence using temporary file and atomic rename
     */
    async persist() {
        this.writeLock = this.writeLock.then(async () => {
            const tempPath = `${this.filePath}.tmp.${Date.now()}`;
            const jsonContent = JSON.stringify(this.data, null, 2);
            await fs_1.default.promises.writeFile(tempPath, jsonContent, 'utf8');
            await fs_1.default.promises.rename(tempPath, this.filePath);
        });
        return this.writeLock;
    }
    persistSync() {
        const tempPath = `${this.filePath}.tmp.${Date.now()}`;
        const jsonContent = JSON.stringify(this.data, null, 2);
        fs_1.default.writeFileSync(tempPath, jsonContent, 'utf8');
        fs_1.default.renameSync(tempPath, this.filePath);
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
    getServices() {
        return [...this.data.services];
    }
    getServiceById(id) {
        return this.data.services.find((s) => s.id === id);
    }
    getServiceByExternalId(externalId) {
        return this.data.services.find((s) => s.externalId === externalId);
    }
    async upsertServices(rawServices, markupPercent) {
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
            }
            else {
                const newService = {
                    id: crypto_1.default.randomUUID(),
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
    async updateService(id, updates) {
        const numId = Number(id);
        const index = this.data.services.findIndex((s) => s.id === id || (!isNaN(numId) && s.externalId === numId));
        if (index === -1)
            return null;
        const current = this.data.services[index];
        let customRate = updates.customRate !== undefined ? Number(updates.customRate) : current.customRate;
        let markupPercent = updates.markupPercent !== undefined ? Number(updates.markupPercent) : current.markupPercent;
        // If customRate was explicitly provided without markupPercent, compute markupPercent based on originalRate
        if (updates.customRate !== undefined && updates.markupPercent === undefined && current.originalRate > 0) {
            markupPercent = Number((((customRate - current.originalRate) / current.originalRate) * 100).toFixed(2));
        }
        else if (updates.markupPercent !== undefined && updates.customRate === undefined) {
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
    async batchUpdateMarkup(options) {
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
            }
            else if (fixedIncrease !== undefined) {
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
    async bulkUpdateStatus(serviceIds, isActive) {
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
    ensureWelcomeTicket() {
        if (!this.data.tickets)
            this.data.tickets = [];
        if (this.data.tickets.length === 0) {
            const demoUser = this.data.users.find((u) => u.username === 'demouser');
            this.data.tickets.push({
                id: crypto_1.default.randomUUID(),
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
