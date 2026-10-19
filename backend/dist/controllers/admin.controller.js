"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_service_1 = require("../services/db.service");
const smmfollows_service_1 = require("../services/smmfollows.service");
const encryption_service_1 = require("../services/encryption.service");
const orders_controller_1 = require("./orders.controller");
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
        const services = await db.getServicesAsync();
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
                totalRevenue: Number(totalRevenue.toFixed(3)),
                totalCost: Number(totalCost.toFixed(3)),
                estimatedProfit: Number(estimatedProfit.toFixed(3)),
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
        await db.logAudit('ADMIN_BALANCE_ADJUST', `Admin ${req.user?.username} adjusted balance of ${targetUser.username} by $${numAmount.toFixed(3)} (${reason || 'No note'})`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
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
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        let orders = db.getOrders();
        const activeOrders = orders.filter((o) => o.externalOrderId && !['COMPLETED', 'CANCELED'].includes(o.status));
        if (activeOrders.length > 0) {
            try {
                const extIds = activeOrders.map((o) => o.externalOrderId);
                for (let i = 0; i < extIds.length; i += 50) {
                    const chunk = extIds.slice(i, i + 50);
                    const multiStatus = await smm.getMultipleOrdersStatus(chunk);
                    if (multiStatus && typeof multiStatus === 'object') {
                        for (const order of activeOrders) {
                            const extId = order.externalOrderId.toString();
                            const statusRes = multiStatus[extId];
                            if (statusRes && !statusRes.error && statusRes.status) {
                                const mappedStatus = orders_controller_1.OrdersController.mapProviderStatus(statusRes.status);
                                const updated = await db.updateOrder(order.id, {
                                    status: mappedStatus,
                                    startCount: statusRes.start_count ?? order.startCount,
                                    remains: statusRes.remains ?? order.remains,
                                    providerResponse: JSON.stringify(statusRes),
                                });
                                if (updated) {
                                    const idx = orders.findIndex((o) => o.id === order.id);
                                    if (idx !== -1) {
                                        orders[idx] = updated;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (err) {
                console.warn('Auto live-sync active orders for admin warning:', err.message);
            }
        }
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
     * Batch update markup percentage or fixed increase for services (all, by platform, by category, or selected)
     */
    static async batchUpdateMarkup(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { markupPercent, fixedIncrease, platform, category, serviceIds } = req.body;
        const numMarkup = markupPercent !== undefined ? parseFloat(markupPercent) : undefined;
        const numIncrease = fixedIncrease !== undefined ? parseFloat(fixedIncrease) : undefined;
        if (numMarkup === undefined && numIncrease === undefined) {
            res.status(400).json({ success: false, error: 'Provide either markupPercent or fixedIncrease' });
            return;
        }
        const result = await db.batchUpdateMarkup({
            markupPercent: numMarkup,
            fixedIncrease: numIncrease,
            platform,
            category,
            serviceIds,
        });
        const targetDesc = serviceIds?.length
            ? `${serviceIds.length} selected services`
            : platform
                ? `platform '${platform}'`
                : category
                    ? `category '${category}'`
                    : 'all catalog services';
        const ruleDesc = numMarkup !== undefined ? `+${numMarkup}% margin` : `+$${numIncrease?.toFixed(4)} fixed margin`;
        await db.logAudit('MARKUP_UPDATED', `Admin ${req.user?.username} updated profit margin to ${ruleDesc} for ${targetDesc} (${result.updatedCount} items)`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({
            success: true,
            message: `Profit margin updated (${ruleDesc}) across ${result.updatedCount} services`,
            updatedCount: result.updatedCount,
        });
    }
    /**
     * Bulk toggle services active/disabled status
     */
    static async bulkUpdateServiceStatus(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { serviceIds, isActive } = req.body;
        const count = await db.bulkUpdateStatus(serviceIds, Boolean(isActive));
        await db.logAudit('SERVICE_STATUS_CHANGE', `Admin ${req.user?.username} set status to ${isActive ? 'ACTIVE' : 'DISABLED'} for ${count} services`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
        res.json({
            success: true,
            message: `Successfully set ${count} services to ${isActive ? 'ACTIVE' : 'DISABLED'}`,
            updatedCount: count,
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
        const bakongAccountId = db.getSettingValue('bakong_account_id') || env_1.ENV.BAKONG_ACCOUNT_ID;
        const bakongMerchantName = db.getSettingValue('bakong_merchant_name') || env_1.ENV.BAKONG_MERCHANT_NAME;
        const bakongMerchantCity = db.getSettingValue('bakong_merchant_city') || env_1.ENV.BAKONG_MERCHANT_CITY;
        res.json({
            success: true,
            settings: {
                smmfollows_api_key_masked: encryption_service_1.EncryptionService.maskKey(rawKey),
                smmfollows_api_url: rawUrl,
                default_markup_percent: parseFloat(markup),
                site_name: siteName,
                bakong_account_id: bakongAccountId,
                bakong_merchant_name: bakongMerchantName,
                bakong_merchant_city: bakongMerchantCity,
            },
        });
    }
    /**
     * Update provider settings with AES-256-GCM encryption
     */
    static async updateSettings(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { apiKey, apiUrl, defaultMarkupPercent, siteName, bakongAccountId, bakongMerchantName, bakongMerchantCity } = req.body;
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
        if (bakongAccountId) {
            await db.setSetting('bakong_account_id', bakongAccountId.trim(), false);
        }
        if (bakongMerchantName) {
            await db.setSetting('bakong_merchant_name', bakongMerchantName.trim(), false);
        }
        if (bakongMerchantCity) {
            await db.setSetting('bakong_merchant_city', bakongMerchantCity.trim(), false);
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
