"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresService = void 0;
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
class PostgresService {
    static instance;
    pool = null;
    connected = false;
    constructor() {
        if (env_1.ENV.DATABASE_URL) {
            this.pool = new pg_1.Pool({
                connectionString: env_1.ENV.DATABASE_URL,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
            this.pool.on('error', (err) => {
                console.error('Unexpected PostgreSQL Pool Error:', err);
            });
        }
    }
    static getInstance() {
        if (!PostgresService.instance) {
            PostgresService.instance = new PostgresService();
        }
        return PostgresService.instance;
    }
    isEnabled() {
        return !!this.pool;
    }
    isHealthy() {
        return this.connected;
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized. DATABASE_URL is not set.');
        }
        return this.pool.query(text, params);
    }
    /**
     * Initializes PostgreSQL database schema, tables, indices, and seed admin user
     */
    async init() {
        if (!this.pool) {
            console.log('ℹ️  PostgreSQL: DATABASE_URL not set, running in local file-backed mode.');
            return false;
        }
        try {
            // Test basic connection
            const client = await this.pool.connect();
            client.release();
            this.connected = true;
            console.log('✅ Connected to PostgreSQL database successfully.');
            // Run DDL migrations
            await this.createTables();
            await this.seedAdminUser();
            return true;
        }
        catch (err) {
            this.connected = false;
            console.warn(`⚠️  PostgreSQL connection failed (${err.message}). Falling back to local storage.`);
            return false;
        }
    }
    async createTables() {
        if (!this.pool)
            return;
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance NUMERIC(14, 4) DEFAULT 0.0000,
        total_spent NUMERIC(14, 4) DEFAULT 0.0000,
        total_orders INT DEFAULT 0,
        role VARCHAR(32) DEFAULT 'USER',
        status VARCHAR(32) DEFAULT 'active',
        api_key VARCHAR(128) UNIQUE NOT NULL,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255),
        token_version INT DEFAULT 1,
        failed_login_attempts INT DEFAULT 0,
        lockout_until TIMESTAMPTZ,
        timezone VARCHAR(64) DEFAULT 'UTC',
        avatar TEXT,
        custom_avatar TEXT,
        google_picture TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(64) NOT NULL,
        service_id VARCHAR(64) NOT NULL,
        external_service_id INT,
        external_order_id VARCHAR(64),
        service_name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        platform VARCHAR(64) NOT NULL,
        link TEXT NOT NULL,
        quantity INT NOT NULL,
        rate_per_thousand NUMERIC(14, 4) NOT NULL,
        charge NUMERIC(14, 4) NOT NULL,
        original_cost NUMERIC(14, 4) DEFAULT 0,
        profit NUMERIC(14, 4) DEFAULT 0,
        status VARCHAR(64) DEFAULT 'PROCESSING',
        start_count INT,
        remains INT,
        refill BOOLEAN DEFAULT FALSE,
        cancel BOOLEAN DEFAULT FALSE,
        provider_response TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(64) NOT NULL,
        amount NUMERIC(14, 4) NOT NULL,
        balance_before NUMERIC(14, 4) NOT NULL,
        balance_after NUMERIC(14, 4) NOT NULL,
        reference_id VARCHAR(255),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(64) PRIMARY KEY,
        ticket_number SERIAL UNIQUE,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(64) NOT NULL,
        subject_type VARCHAR(128) NOT NULL,
        sub_type VARCHAR(128),
        order_ids VARCHAR(500),
        message TEXT NOT NULL,
        referral_source VARCHAR(128),
        status VARCHAR(64) DEFAULT 'New',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(128) PRIMARY KEY,
        value TEXT NOT NULL,
        is_encrypted BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS service_overrides (
        service_id VARCHAR(64) PRIMARY KEY,
        custom_rate NUMERIC(14, 4),
        markup_percent NUMERIC(8, 2),
        is_active BOOLEAN,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        action VARCHAR(128) NOT NULL,
        details TEXT NOT NULL,
        ip_address VARCHAR(64) NOT NULL,
        user_id VARCHAR(64),
        username VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
    }
    async seedAdminUser() {
        if (!this.pool)
            return;
        const res = await this.pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['ADMIN']);
        if (res.rows.length === 0) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(env_1.ENV.ADMIN_PASSWORD, salt);
            const id = crypto_1.default.randomUUID();
            const apiKey = `smm_${crypto_1.default.randomBytes(24).toString('hex')}`;
            await this.pool.query(`INSERT INTO users (id, username, email, password_hash, balance, role, status, api_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                id,
                'admin',
                env_1.ENV.ADMIN_EMAIL,
                passwordHash,
                100.0,
                'ADMIN',
                'active',
                apiKey,
            ]);
            console.log(`👑 PostgreSQL Root Administrator Seeded: ${env_1.ENV.ADMIN_EMAIL}`);
        }
    }
    // ================= DATA ACCESS HELPERS =================
    async getAllUsers() {
        const res = await this.query('SELECT * FROM users ORDER BY created_at DESC');
        return res.rows.map(this.mapUserFromDb);
    }
    async getUserById(id) {
        const res = await this.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] ? this.mapUserFromDb(res.rows[0]) : undefined;
    }
    async getUserByEmail(email) {
        const res = await this.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        return res.rows[0] ? this.mapUserFromDb(res.rows[0]) : undefined;
    }
    async getUserByUsername(username) {
        const res = await this.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        return res.rows[0] ? this.mapUserFromDb(res.rows[0]) : undefined;
    }
    async getUserByApiKey(apiKey) {
        const res = await this.query('SELECT * FROM users WHERE api_key = $1', [apiKey]);
        return res.rows[0] ? this.mapUserFromDb(res.rows[0]) : undefined;
    }
    async createUser(userData) {
        const id = crypto_1.default.randomUUID();
        const apiKey = `smm_${crypto_1.default.randomBytes(24).toString('hex')}`;
        const balance = userData.balance ?? 0.0;
        const role = userData.role ?? 'USER';
        const status = userData.status ?? 'active';
        const res = await this.query(`INSERT INTO users (id, username, email, password_hash, balance, role, status, api_key, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            id,
            userData.username.trim(),
            userData.email.toLowerCase().trim(),
            userData.passwordHash,
            balance,
            role,
            status,
            apiKey,
            userData.timezone || 'UTC',
        ]);
        return this.mapUserFromDb(res.rows[0]);
    }
    async updateUser(id, updates) {
        const fieldMap = {
            username: 'username',
            email: 'email',
            passwordHash: 'password_hash',
            balance: 'balance',
            totalSpent: 'total_spent',
            totalOrders: 'total_orders',
            role: 'role',
            status: 'status',
            apiKey: 'api_key',
            twoFactorEnabled: 'two_factor_enabled',
            twoFactorSecret: 'two_factor_secret',
            tokenVersion: 'token_version',
            failedLoginAttempts: 'failed_login_attempts',
            lockoutUntil: 'lockout_until',
            timezone: 'timezone',
            avatar: 'avatar',
            customAvatar: 'custom_avatar',
            googlePicture: 'google_picture',
        };
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, val] of Object.entries(updates)) {
            const colName = fieldMap[key];
            if (colName) {
                setClauses.push(`${colName} = $${paramIndex++}`);
                values.push(val);
            }
        }
        if (setClauses.length === 0) {
            return (await this.getUserById(id)) || null;
        }
        setClauses.push(`updated_at = NOW()`);
        values.push(id);
        const queryText = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const res = await this.query(queryText, values);
        return res.rows[0] ? this.mapUserFromDb(res.rows[0]) : null;
    }
    async adjustUserBalance(userId, amount, type, referenceId, description) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const userRes = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
            if (userRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, newBalance: 0, error: 'User not found' };
            }
            const currentBalance = parseFloat(userRes.rows[0].balance);
            const newBalance = Number((currentBalance + amount).toFixed(4));
            if (newBalance < 0) {
                await client.query('ROLLBACK');
                return { success: false, newBalance: currentBalance, error: 'Insufficient funds' };
            }
            await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2', [newBalance, userId]);
            const txId = crypto_1.default.randomUUID();
            await client.query(`INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, reference_id, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`, [txId, userId, type, Math.abs(amount), currentBalance, newBalance, referenceId, description || `Transaction ${type}`]);
            await client.query('COMMIT');
            return { success: true, newBalance };
        }
        catch (err) {
            await client.query('ROLLBACK');
            return { success: false, newBalance: 0, error: err.message };
        }
        finally {
            client.release();
        }
    }
    async getOrders(userId) {
        let query = 'SELECT * FROM orders ORDER BY created_at DESC';
        let params = [];
        if (userId) {
            query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
            params = [userId];
        }
        const res = await this.query(query, params);
        return res.rows.map(this.mapOrderFromDb);
    }
    async getOrderById(id) {
        const res = await this.query('SELECT * FROM orders WHERE id = $1', [id]);
        return res.rows[0] ? this.mapOrderFromDb(res.rows[0]) : undefined;
    }
    async createOrder(data) {
        const id = crypto_1.default.randomUUID();
        const res = await this.query(`INSERT INTO orders (
        id, user_id, username, service_id, external_service_id, external_order_id,
        service_name, category, platform, link, quantity, rate_per_thousand,
        charge, original_cost, profit, status, start_count, remains, refill, cancel, provider_response
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`, [
            id,
            data.userId,
            data.username,
            data.serviceId,
            data.externalServiceId || null,
            data.externalOrderId || null,
            data.serviceName,
            data.category,
            data.platform,
            data.link,
            data.quantity,
            data.ratePerThousand,
            data.charge,
            data.originalCost || 0,
            data.profit || 0,
            data.status || 'PROCESSING',
            data.startCount || null,
            data.remains || null,
            Boolean(data.refill),
            Boolean(data.cancel),
            data.providerResponse || null,
        ]);
        return this.mapOrderFromDb(res.rows[0]);
    }
    async updateOrder(id, updates) {
        const fieldMap = {
            status: 'status',
            startCount: 'start_count',
            remains: 'remains',
            externalOrderId: 'external_order_id',
            providerResponse: 'provider_response',
        };
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, val] of Object.entries(updates)) {
            const col = fieldMap[key];
            if (col) {
                setClauses.push(`${col} = $${paramIndex++}`);
                values.push(val);
            }
        }
        if (setClauses.length === 0) {
            return (await this.getOrderById(id)) || null;
        }
        setClauses.push('updated_at = NOW()');
        values.push(id);
        const res = await this.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return res.rows[0] ? this.mapOrderFromDb(res.rows[0]) : null;
    }
    async getTransactions(userId) {
        let query = 'SELECT * FROM transactions ORDER BY created_at DESC';
        let params = [];
        if (userId) {
            query = 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC';
            params = [userId];
        }
        const res = await this.query(query, params);
        return res.rows.map(this.mapTransactionFromDb);
    }
    async getTickets(userId) {
        let query = 'SELECT * FROM tickets ORDER BY created_at DESC';
        let params = [];
        if (userId) {
            query = 'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC';
            params = [userId];
        }
        const res = await this.query(query, params);
        return res.rows.map(this.mapTicketFromDb);
    }
    async createTicket(data) {
        const id = crypto_1.default.randomUUID();
        const res = await this.query(`INSERT INTO tickets (id, user_id, username, subject_type, sub_type, order_ids, message, referral_source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            id,
            data.userId,
            data.username,
            data.subjectType,
            data.subType || null,
            data.orderIds || null,
            data.message,
            data.referralSource || null,
            data.status || 'New',
        ]);
        return this.mapTicketFromDb(res.rows[0]);
    }
    async getSettingValue(key) {
        const res = await this.query('SELECT value FROM settings WHERE key = $1', [key]);
        return res.rows[0]?.value || null;
    }
    async getAllSettings() {
        const res = await this.query('SELECT * FROM settings');
        const settings = {};
        for (const row of res.rows) {
            settings[row.key] = {
                key: row.key,
                value: row.value,
                isEncrypted: row.is_encrypted,
                updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
            };
        }
        return settings;
    }
    async setSetting(key, value, isEncrypted = false) {
        await this.query(`INSERT INTO settings (key, value, is_encrypted, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, is_encrypted = EXCLUDED.is_encrypted, updated_at = NOW()`, [key, value, isEncrypted]);
    }
    async logAudit(action, details, ip, userId, username) {
        const id = crypto_1.default.randomUUID();
        await this.query(`INSERT INTO audit_logs (id, action, details, ip_address, user_id, username, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [id, action, details, ip, userId || null, username || null]);
    }
    async getAuditLogs() {
        const res = await this.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
        return res.rows.map((row) => ({
            id: row.id,
            action: row.action,
            details: row.details,
            ip: row.ip_address,
            userId: row.user_id,
            username: row.username,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        }));
    }
    // ================= MAPPERS =================
    mapUserFromDb(row) {
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            passwordHash: row.password_hash,
            balance: parseFloat(row.balance || '0'),
            totalSpent: parseFloat(row.total_spent || '0'),
            totalOrders: parseInt(row.total_orders || '0', 10),
            role: row.role,
            status: row.status,
            apiKey: row.api_key,
            twoFactorEnabled: Boolean(row.two_factor_enabled),
            twoFactorSecret: row.two_factor_secret || undefined,
            tokenVersion: parseInt(row.token_version || '1', 10),
            failedLoginAttempts: parseInt(row.failed_login_attempts || '0', 10),
            lockoutUntil: row.lockout_until ? row.lockout_until.toISOString() : undefined,
            timezone: row.timezone || 'UTC',
            avatar: row.avatar || undefined,
            customAvatar: row.custom_avatar || undefined,
            googlePicture: row.google_picture || undefined,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
        };
    }
    mapOrderFromDb(row) {
        return {
            id: row.id,
            userId: row.user_id,
            username: row.username,
            serviceId: row.service_id,
            externalServiceId: parseInt(row.external_service_id || '0', 10),
            externalOrderId: row.external_order_id || undefined,
            serviceName: row.service_name,
            category: row.category,
            platform: row.platform,
            link: row.link,
            quantity: parseInt(row.quantity, 10),
            ratePerThousand: parseFloat(row.rate_per_thousand),
            charge: parseFloat(row.charge),
            originalCost: parseFloat(row.original_cost || '0'),
            profit: parseFloat(row.profit || '0'),
            status: row.status,
            startCount: row.start_count !== null ? parseInt(row.start_count, 10) : undefined,
            remains: row.remains !== null ? parseInt(row.remains, 10) : undefined,
            refill: Boolean(row.refill),
            cancel: Boolean(row.cancel),
            providerResponse: row.provider_response || undefined,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
        };
    }
    mapTransactionFromDb(row) {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            amount: parseFloat(row.amount),
            balanceBefore: parseFloat(row.balance_before),
            balanceAfter: parseFloat(row.balance_after),
            referenceId: row.reference_id || undefined,
            description: row.description || undefined,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
        };
    }
    mapTicketFromDb(row) {
        return {
            id: row.id,
            ticketNumber: parseInt(row.ticket_number, 10),
            userId: row.user_id,
            username: row.username,
            subjectType: row.subject_type,
            subType: row.sub_type || undefined,
            orderIds: row.order_ids || undefined,
            message: row.message,
            referralSource: row.referral_source || undefined,
            status: row.status,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
        };
    }
}
exports.PostgresService = PostgresService;
