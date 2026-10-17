"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesController = void 0;
const db_service_1 = require("../services/db.service");
let isSyncing = false;
class ServicesController {
    /**
     * Get all available services with search and filtering directly from SMMFollows cache
     */
    static async getServices(req, res) {
        try {
            const db = db_service_1.DatabaseService.getInstance();
            const allServices = await db.getServicesAsync();
            let services = [...allServices];
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
            // Extract unique categories & platforms for UI filters from full catalog
            const allPlatforms = Array.from(new Set(allServices.map((s) => s.platform))).sort();
            const allCategories = Array.from(new Set(allServices.map((s) => s.category))).sort();
            res.json({
                success: true,
                total: services.length,
                categories: allCategories,
                platforms: allPlatforms,
                services,
            });
        }
        catch (err) {
            console.error('Error fetching services:', err.message);
            res.status(500).json({ success: false, error: 'Failed to load services' });
        }
    }
    /**
     * Get service by internal ID or SMMFollows ID
     */
    static async getServiceById(req, res) {
        try {
            const db = db_service_1.DatabaseService.getInstance();
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const service = (await db.getServiceByIdAsync(id)) ||
                (await db.getServiceByExternalIdAsync(parseInt(id, 10)));
            if (!service) {
                res.status(404).json({ success: false, error: 'Service not found' });
                return;
            }
            res.json({ success: true, service });
        }
        catch (err) {
            res.status(500).json({ success: false, error: 'Failed to find service' });
        }
    }
    /**
     * Force sync/refresh services directly from SMMFollows API
     */
    static async syncServices(req, res) {
        if (isSyncing) {
            res.status(429).json({ success: false, error: 'Sync already in progress. Please wait a moment.' });
            return;
        }
        isSyncing = true;
        try {
            const db = db_service_1.DatabaseService.getInstance();
            const markupPercent = req.body?.markupPercent
                ? parseFloat(req.body.markupPercent)
                : undefined;
            if (markupPercent !== undefined && !isNaN(markupPercent)) {
                await db.setSetting('default_markup_percent', markupPercent.toString(), false);
            }
            const freshServices = await db.getServicesAsync(true); // Force live reload from SMMFollows
            await db.logAudit('SERVICES_SYNCED', `Synchronized ${freshServices.length} live services directly from SMMFollows provider`, req.ip || '127.0.0.1', req.user?.id, req.user?.username);
            res.json({
                success: true,
                message: `Successfully synchronized ${freshServices.length} services from SMMFollows`,
                totalServices: freshServices.length,
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message || 'Failed to sync services from provider' });
        }
        finally {
            isSyncing = false;
        }
    }
}
exports.ServicesController = ServicesController;
