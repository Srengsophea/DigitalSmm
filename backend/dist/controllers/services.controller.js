"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesController = void 0;
const db_service_1 = require("../services/db.service");
const smmfollows_service_1 = require("../services/smmfollows.service");
let isSyncing = false;
class ServicesController {
    /**
     * Get all available services with search and filtering
     */
    static async getServices(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        let services = db.getServices();
        // Auto-trigger initial sync if DB has no services yet
        if (services.length === 0 && !isSyncing) {
            isSyncing = true;
            ServicesController.backgroundSync()
                .catch((err) => console.error('Initial background sync failed:', err))
                .finally(() => {
                isSyncing = false;
            });
        }
        const { platform, category, search, minPrice, maxPrice, activeOnly = 'true' } = req.query;
        if (activeOnly === 'true') {
            services = services.filter((s) => s.isActive);
        }
        if (platform && typeof platform === 'string' && platform !== 'All') {
            services = services.filter((s) => s.platform.toLowerCase() === platform.toLowerCase());
        }
        if (category && typeof category === 'string' && category !== 'All') {
            services = services.filter((s) => s.category.toLowerCase().includes(category.toLowerCase()));
        }
        if (search && typeof search === 'string') {
            const q = search.toLowerCase().trim();
            services = services.filter((s) => s.name.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.externalId.toString().includes(q));
        }
        if (minPrice && typeof minPrice === 'string') {
            const min = parseFloat(minPrice);
            if (!isNaN(min))
                services = services.filter((s) => s.customRate >= min);
        }
        if (maxPrice && typeof maxPrice === 'string') {
            const max = parseFloat(maxPrice);
            if (!isNaN(max))
                services = services.filter((s) => s.customRate <= max);
        }
        // Extract unique categories & platforms for UI filters
        const allPlatforms = Array.from(new Set(db.getServices().map((s) => s.platform))).sort();
        const allCategories = Array.from(new Set(db.getServices().map((s) => s.category))).sort();
        res.json({
            success: true,
            total: services.length,
            categories: allCategories,
            platforms: allPlatforms,
            services,
        });
    }
    /**
     * Get service by internal ID or SMMFollows ID
     */
    static async getServiceById(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const service = db.getServiceById(id) ||
            db.getServiceByExternalId(parseInt(id, 10));
        if (!service) {
            res.status(404).json({ success: false, error: 'Service not found' });
            return;
        }
        res.json({ success: true, service });
    }
    /**
     * Force sync services directly from SMMFollows API
     */
    static async syncServices(req, res) {
        if (isSyncing) {
            res.status(429).json({ success: false, error: 'Sync already in progress. Please wait a moment.' });
            return;
        }
        isSyncing = true;
        try {
            const smm = smmfollows_service_1.SMMFollowsService.getInstance();
            const db = db_service_1.DatabaseService.getInstance();
            const rawServices = await smm.getServices();
            const markupPercent = req.body?.markupPercent
                ? parseFloat(req.body.markupPercent)
                : undefined;
            const { count } = await db.upsertServices(rawServices, markupPercent);
            await db.logAudit('SERVICES_SYNCED', `Synchronized ${count} services from SMMFollows provider`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
            res.json({
                success: true,
                message: `Successfully synchronized ${count} services from SMMFollows`,
                totalServices: count,
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message || 'Failed to sync services from provider' });
        }
        finally {
            isSyncing = false;
        }
    }
    static async backgroundSync() {
        try {
            console.log('🔄 Performing automatic initial sync with SMMFollows...');
            const smm = smmfollows_service_1.SMMFollowsService.getInstance();
            const db = db_service_1.DatabaseService.getInstance();
            const rawServices = await smm.getServices();
            const { count } = await db.upsertServices(rawServices);
            console.log(`✅ Automatic initial sync completed: ${count} services ready.`);
        }
        catch (err) {
            console.error('❌ Automatic initial sync error:', err.message);
        }
    }
}
exports.ServicesController = ServicesController;
