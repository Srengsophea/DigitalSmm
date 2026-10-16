"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_service_1 = require("../services/db.service");
const smmfollows_service_1 = require("../services/smmfollows.service");
const encryption_service_1 = require("../services/encryption.service");
const env_1 = require("../config/env");
class AdminController {
    /**
     * Get high-level system analytics & live provider balance
     */
    static async getStats(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        const users = db.getUsers();
        const orders = db.getOrders();
        const services = db.getServices();
        const totalRevenue = orders
            .filter((o) => o.status !== 'CANCELED')
            .reduce((sum, o) => sum + o.charge, 0);
        const totalCost = orders
            .filter((o) => o.status !== 'CANCELED')
            .reduce((sum, o) => sum + o.originalCost, 0);
        const estimatedProfit = totalRevenue - totalCost;
        // Check live SMMFollows balance
        let providerBalance = '0.00';
        let providerCurrency = 'USD';
        let providerStatus = 'CONNECTED';
        let providerError = null;
        try {
            const balanceData = await smm.getBalance();
            providerBalance = balanceData.balance;
            providerCurrency = balanceData.currency;
        }
        catch (err) {
            providerStatus = 'ERROR';
            providerError = err.message;
        }
        const orderCounts = {
            total: orders.length,
            completed: orders.filter((o) => o.status === 'COMPLETED').length,
            processing: orders.filter((o) => o.status === 'PROCESSING' || o.status === 'IN_PROGRESS').length,
            pending: orders.filter((o) => o.status === 'PENDING').length,
            canceled: orders.filter((o) => o.status === 'CANCELED').length,
        };
        res.json({
            success: true,
            stats: {
                totalUsers: users.length,
                totalOrders: orders.length,
                totalServices: services.length,
                activeServices: services.filter((s) => s.isActive).length,
                totalRevenue: Number(totalRevenue.toFixed(2)),
                totalCost: Number(totalCost.toFixed(2)),
                estimatedProfit: Number(estimatedProfit.toFixed(2)),
                orderCounts,
                provider: {
                    name: 'SMMFollows',
                    status: providerStatus,
                    balance: providerBalance,
                    currency: providerCurrency,
                    error: providerError,
                },
            },
        });
    }
    /**
     * List all registered users
     */
    static async getAllUsers(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const users = db.getUsers().map((u) => {
            const { passwordHash: _, ...safeUser } = u;
            return safeUser;
        });
        res.json({ success: true, total: users.length, users });
    }
    /**
     * Adjust user balance by admin
     */
    static async adjustUserBalance(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { userId, amount, reason } = req.body;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            res.status(400).json({ success: false, error: 'Valid amount is required' });
            return;
        }
        const targetUser = db.getUserById(userId);
        if (!targetUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const result = await db.adjustUserBalance(userId, numAmount, 'ADMIN_ADJUSTMENT', `ADMIN-${Date.now()}`, reason || `Manual adjustment by administrator ${req.user?.username}`);
        if (!result.success) {
            res.status(400).json({ success: false, error: result.error });
            return;
        }
        await db.logAudit('ADMIN_BALANCE_ADJUST', `Admin ${req.user?.username} adjusted balance of ${targetUser.username} by $${numAmount.toFixed(2)} (${reason || 'No note'})`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({
            success: true,
            message: `Balance updated successfully for ${targetUser.username}`,
            newBalance: result.newBalance,
        });
    }
    /**
     * Toggle user account status (active / suspended)
     */
    static async toggleUserStatus(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { userId, status } = req.body;
        const targetUser = db.getUserById(userId);
        if (!targetUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        if (targetUser.role === 'ADMIN') {
            res.status(400).json({ success: false, error: 'Cannot suspend admin accounts' });
            return;
        }
        const updated = await db.updateUser(userId, { status });
        await db.logAudit('USER_STATUS_CHANGE', `Admin ${req.user?.username} changed status of ${targetUser.username} to ${status}`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({
            success: true,
            message: `User status changed to ${status}`,
            user: updated,
        });
    }
    /**
     * Get all orders with full provider details
     */
    static async getAllOrders(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const orders = db.getOrders();
        res.json({ success: true, total: orders.length, orders });
    }
    /**
     * Update individual service
     */
    static async updateService(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { customRate, markupPercent, isActive } = req.body;
        const updated = await db.updateService(id, {
            ...(customRate !== undefined ? { customRate: parseFloat(customRate) } : {}),
            ...(markupPercent !== undefined ? { markupPercent: parseFloat(markupPercent) } : {}),
            ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        });
        if (!updated) {
            res.status(404).json({ success: false, error: 'Service not found' });
            return;
        }
        res.json({ success: true, service: updated });
    }
    /**
     * Batch update markup percentage for all services
     */
    static async batchUpdateMarkup(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { markupPercent } = req.body;
        const numMarkup = parseFloat(markupPercent);
        if (isNaN(numMarkup) || numMarkup < 0) {
            res.status(400).json({ success: false, error: 'Invalid markup percentage' });
            return;
        }
        await db.batchUpdateMarkup(numMarkup);
        await db.logAudit('MARKUP_UPDATED', `Admin ${req.user?.username} batch updated global markup to +${numMarkup}%`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({
            success: true,
            message: `Global markup updated to +${numMarkup}% for all services`,
        });
    }
    /**
     * Get settings with encrypted sensitive values masked
     */
    static async getSettings(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const rawKey = db.getSettingValue('smmfollows_api_key') || env_1.ENV.SMMFOLLOWS_API_KEY;
        const rawUrl = db.getSettingValue('smmfollows_api_url') || env_1.ENV.SMMFOLLOWS_API_URL;
        const markup = db.getSettingValue('default_markup_percent') || env_1.ENV.DEFAULT_MARKUP_PERCENT.toString();
        const siteName = db.getSettingValue('site_name') || 'DigitalSMM';
        res.json({
            success: true,
            settings: {
                smmfollows_api_key_masked: encryption_service_1.EncryptionService.maskKey(rawKey),
                smmfollows_api_url: rawUrl,
                default_markup_percent: parseFloat(markup),
                site_name: siteName,
            },
        });
    }
    /**
     * Update provider settings with AES-256-GCM encryption
     */
    static async updateSettings(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { apiKey, apiUrl, defaultMarkupPercent, siteName } = req.body;
        if (apiKey) {
            await db.setSetting('smmfollows_api_key', apiKey, true);
        }
        if (apiUrl) {
            await db.setSetting('smmfollows_api_url', apiUrl, false);
        }
        if (defaultMarkupPercent !== undefined) {
            await db.setSetting('default_markup_percent', defaultMarkupPercent.toString(), false);
        }
        if (siteName) {
            await db.setSetting('site_name', siteName, false);
        }
        await db.logAudit('SETTINGS_UPDATED', `Admin ${req.user?.username} updated system/provider settings`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({ success: true, message: 'Settings saved and encrypted securely' });
    }
    /**
     * Get security audit logs
     */
    static async getAuditLogs(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const logs = db.getAuditLogs();
        res.json({ success: true, total: logs.length, logs });
    }
}
exports.AdminController = AdminController;
