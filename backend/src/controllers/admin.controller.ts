import { Response } from 'express';
import { DatabaseService } from '../services/db.service';
import { SMMFollowsService } from '../services/smmfollows.service';
import { ProviderService } from '../services/provider.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { EncryptionService } from '../services/encryption.service';
import { OrdersController } from './orders.controller';
import { ENV } from '../config/env';

export class AdminController {
  /**
   * Get high-level system analytics & live provider balance
   */
  public static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();

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

    // Check live balances for all configured providers
    const providersList = db.getProviders();
    const providerService = ProviderService.getInstance();
    const providersWithBalance = await Promise.all(
      providersList.map(async (p) => {
        try {
          const bal = await providerService.getBalance(p.id);
          return {
            id: p.id,
            name: p.name,
            status: 'CONNECTED',
            balance: bal.balance,
            currency: bal.currency,
          };
        } catch (err: any) {
          return {
            id: p.id,
            name: p.name,
            status: 'ERROR',
            balance: '0.00',
            currency: 'USD',
            error: err.message,
          };
        }
      })
    );

    const primaryProvider = providersWithBalance.find((p) => p.id === 'smmpwr') ||
      providersWithBalance.find((p) => p.id === 'smmfollows') ||
      providersWithBalance[0] || {
        id: 'smmfollows',
        name: 'SMMFollows',
        status: 'DISCONNECTED',
        balance: '0.00',
        currency: 'USD',
      };

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
        provider: primaryProvider,
        providers: providersWithBalance,
      },
    });
  }

  /**
   * List all registered users
   */
  public static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const users = db.getUsers().map((u) => {
      const { passwordHash: _, ...safeUser } = u;
      return safeUser;
    });

    res.json({ success: true, total: users.length, users });
  }

  /**
   * Adjust user balance by admin
   */
  public static async adjustUserBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
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

    const result = await db.adjustUserBalance(
      userId,
      numAmount,
      'ADMIN_ADJUSTMENT',
      `ADMIN-${Date.now()}`,
      reason || `Manual adjustment by administrator ${req.user?.username}`
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    await db.logAudit(
      'ADMIN_BALANCE_ADJUST',
      `Admin ${req.user?.username} adjusted balance of ${targetUser.username} by $${numAmount.toFixed(3)} (${reason || 'No note'})`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({
      success: true,
      message: `Balance updated successfully for ${targetUser.username}`,
      newBalance: result.newBalance,
    });
  }

  /**
   * Toggle user account status (active / suspended)
   */
  public static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
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

    await db.logAudit(
      'USER_STATUS_CHANGE',
      `Admin ${req.user?.username} changed status of ${targetUser.username} to ${status}`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({
      success: true,
      message: `User status changed to ${status}`,
      user: updated,
    });
  }

  /**
   * Get all orders with full provider details
   */
  public static async getAllOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();
    let orders = db.getOrders();

    const activeOrders = orders.filter(
      (o) => o.externalOrderId && !['COMPLETED', 'CANCELED'].includes(o.status)
    );

    if (activeOrders.length > 0) {
      try {
        const providerService = ProviderService.getInstance();
        const byProvider = new Map<string, typeof activeOrders>();
        for (const ord of activeOrders) {
          const pid = ord.provider || 'smmfollows';
          if (!byProvider.has(pid)) byProvider.set(pid, []);
          byProvider.get(pid)!.push(ord);
        }

        for (const [pid, pOrders] of byProvider.entries()) {
          const extIds = pOrders.map((o) => o.externalOrderId as string | number);
          for (let i = 0; i < extIds.length; i += 50) {
            const chunk = extIds.slice(i, i + 50);
            const multiStatus = await providerService.getMultipleOrdersStatus(pid, chunk);
            if (multiStatus && typeof multiStatus === 'object') {
              for (const order of pOrders) {
                const extId = order.externalOrderId!.toString();
                const statusRes = multiStatus[extId];
                if (statusRes && !statusRes.error && statusRes.status) {
                  const updated = await OrdersController.processOrderStatusUpdate(order, statusRes);
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
      } catch (err: any) {
        console.warn('Auto live-sync active orders for admin warning:', err.message);
      }
    }

    res.json({ success: true, total: orders.length, orders });
  }

  /**
   * Update individual service
   */
  public static async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
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
  public static async batchUpdateMarkup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
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

    await db.logAudit(
      'MARKUP_UPDATED',
      `Admin ${req.user?.username} updated profit margin to ${ruleDesc} for ${targetDesc} (${result.updatedCount} items)`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({
      success: true,
      message: `Profit margin updated (${ruleDesc}) across ${result.updatedCount} services`,
      updatedCount: result.updatedCount,
    });
  }

  /**
   * Bulk toggle services active/disabled status
   */
  public static async bulkUpdateServiceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { serviceIds, isActive } = req.body;

    const count = await db.bulkUpdateStatus(serviceIds, Boolean(isActive));

    await db.logAudit(
      'SERVICE_STATUS_CHANGE',
      `Admin ${req.user?.username} set status to ${isActive ? 'ACTIVE' : 'DISABLED'} for ${count} services`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({
      success: true,
      message: `Successfully set ${count} services to ${isActive ? 'ACTIVE' : 'DISABLED'}`,
      updatedCount: count,
    });
  }

  /**
   * Get settings with encrypted sensitive values masked
   */
  public static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const rawKey = db.getSettingValue('smmfollows_api_key') || ENV.SMMFOLLOWS_API_KEY;
    const rawUrl = db.getSettingValue('smmfollows_api_url') || ENV.SMMFOLLOWS_API_URL;
    const markup = db.getSettingValue('default_markup_percent') || ENV.DEFAULT_MARKUP_PERCENT.toString();
    const siteName = db.getSettingValue('site_name') || 'DigitalSMM';
    const bakongAccountId = db.getSettingValue('bakong_account_id') || ENV.BAKONG_ACCOUNT_ID;
    const bakongMerchantName = db.getSettingValue('bakong_merchant_name') || ENV.BAKONG_MERCHANT_NAME;
    const bakongMerchantCity = db.getSettingValue('bakong_merchant_city') || ENV.BAKONG_MERCHANT_CITY;

    res.json({
      success: true,
      settings: {
        smmfollows_api_key_masked: EncryptionService.maskKey(rawKey),
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
  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
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

    await db.logAudit(
      'SETTINGS_UPDATED',
      `Admin ${req.user?.username} updated system/provider settings`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({ success: true, message: 'Settings saved and encrypted securely' });
  }

  /**
   * Get security audit logs
   */
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const logs = db.getAuditLogs();
    res.json({ success: true, total: logs.length, logs });
  }

  // ================= PROVIDERS MANAGEMENT =================
  /**
   * List all providers with balances and masked credentials
   */
  public static async getProviders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const providerService = ProviderService.getInstance();
    const providers = db.getProviders();

    const results = await Promise.all(
      providers.map(async (p) => {
        let balance = '0.00';
        let currency = 'USD';
        let liveStatus = p.status;
        let liveError = null;

        if (p.status === 'active') {
          try {
            const b = await providerService.getBalance(p.id);
            balance = b.balance;
            currency = b.currency;
          } catch (err: any) {
            liveStatus = 'error' as any;
            liveError = err.message;
          }
        }

        return {
          id: p.id,
          name: p.name,
          apiUrl: p.apiUrl,
          apiKeyMasked: EncryptionService.maskKey(p.apiKey),
          status: p.status,
          liveStatus,
          liveError,
          balance,
          currency,
          isDefault: Boolean(p.isDefault),
          updatedAt: p.updatedAt,
        };
      })
    );

    res.json({ success: true, providers: results });
  }

  /**
   * Add a new SMM provider
   */
  public static async addProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { name, apiUrl, apiKey, status, isDefault } = req.body;

    if (!name || !apiUrl || !apiKey) {
      res.status(400).json({ success: false, error: 'Name, API URL, and API Key are required' });
      return;
    }

    const provider = await db.saveProvider({
      name,
      apiUrl,
      apiKey,
      status: status || 'active',
      isDefault: Boolean(isDefault),
    });

    await db.logAudit(
      'PROVIDER_ADDED',
      `Admin ${req.user?.username} added provider "${provider.name}" (${provider.apiUrl})`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.status(201).json({ success: true, message: `Provider "${provider.name}" added successfully`, provider });
  }

  /**
   * Update an existing provider
   */
  public static async updateProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, apiUrl, apiKey, status, isDefault } = req.body;

    const existing = db.getProviderById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    const updated = await db.saveProvider({
      id: existing.id,
      name: name || existing.name,
      apiUrl: apiUrl || existing.apiUrl,
      apiKey: apiKey || existing.apiKey,
      status: status || existing.status,
      isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
    });

    await db.logAudit(
      'PROVIDER_UPDATED',
      `Admin ${req.user?.username} updated provider "${updated.name}"`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({ success: true, message: `Provider "${updated.name}" updated`, provider: updated });
  }

  /**
   * Delete a provider
   */
  public static async deleteProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      const ok = await db.deleteProvider(id);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }
      await db.logAudit(
        'PROVIDER_DELETED',
        `Admin ${req.user?.username} deleted provider "${id}"`,
        req.ip || '127.0.0.1',
        req.user?.id,
        req.user?.username
      );
      res.json({ success: true, message: `Provider deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Fetch live raw services catalog from a provider for preview/selective import
   */
  public static async getProviderRawServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const providerService = ProviderService.getInstance();
    try {
      const rawServices = await providerService.getServices(id);
      const categories = Array.from(new Set(rawServices.map((r) => r.category || 'General'))).sort();
      res.json({
        success: true,
        total: rawServices.length,
        categories,
        services: rawServices,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch provider services' });
    }
  }

  /**
   * Import services from a provider (by category, selected IDs, single ID, or all)
   */
  public static async importServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { providerId, mode, category, serviceIds, markupPercent, fixedIncrease, isActive } = req.body;

    if (!providerId) {
      res.status(400).json({ success: false, error: 'Provider ID is required' });
      return;
    }

    try {
      const result = await db.importServicesFromProvider({
        providerId,
        mode: mode || 'all',
        category,
        serviceIds,
        markupPercent: markupPercent !== undefined ? parseFloat(markupPercent) : undefined,
        fixedIncrease: fixedIncrease !== undefined ? parseFloat(fixedIncrease) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      await db.logAudit(
        'SERVICES_IMPORTED',
        `Admin ${req.user?.username} imported ${result.importedCount} new (${result.updatedCount} updated) services from provider "${providerId}" (mode: ${mode || 'all'})`,
        req.ip || '127.0.0.1',
        req.user?.id,
        req.user?.username
      );

      res.json({
        success: true,
        message: `Successfully processed ${result.importedCount + result.updatedCount} services (${result.importedCount} added, ${result.updatedCount} refreshed)`,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to import services' });
    }
  }

  /**
   * Delete an individual service from catalog
   */
  public static async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const ok = await db.deleteService(id);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }

    await db.logAudit(
      'SERVICE_DELETED',
      `Admin ${req.user?.username} deleted service #${id}`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({ success: true, message: `Service #${id} deleted from catalog` });
  }

  /**
   * Bulk delete services from catalog
   */
  public static async bulkDeleteServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      res.status(400).json({ success: false, error: 'Array of serviceIds is required' });
      return;
    }

    const count = await db.bulkDeleteServices(serviceIds);

    await db.logAudit(
      'SERVICES_BULK_DELETED',
      `Admin ${req.user?.username} deleted ${count} services from catalog`,
      req.ip || '127.0.0.1',
      req.user?.id,
      req.user?.username
    );

    res.json({ success: true, message: `Deleted ${count} services from catalog`, count });
  }
}
