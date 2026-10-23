import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/db.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ENV } from '../config/env';

let isSyncing = false;

function isRequesterAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
    return decoded && decoded.role === 'ADMIN';
  } catch {
    return false;
  }
}

export class ServicesController {
  /**
   * Get all available services with search and filtering directly from SMMFollows cache
   */
  public static async getServices(req: Request, res: Response): Promise<void> {
    try {
      const db = DatabaseService.getInstance();
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
        services = services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            s.externalId.toString().includes(q)
        );
      }

      if (minPrice && typeof minPrice === 'string') {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) services = services.filter((s) => s.customRate >= min);
      }

      if (maxPrice && typeof maxPrice === 'string') {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) services = services.filter((s) => s.customRate <= max);
      }

      // Extract unique categories & platforms for UI filters from full catalog
      const allPlatforms = Array.from(new Set(allServices.map((s) => s.platform))).sort();
      const allCategories = Array.from(new Set(allServices.map((s) => s.category))).sort();

      const isAdmin = isRequesterAdmin(req);
      const outputServices = isAdmin
        ? services
        : services.map((s) => ({
            id: s.id,
            externalId: s.externalId,
            name: s.name,
            category: s.category,
            platform: s.platform,
            customRate: s.customRate,
            min: s.min,
            max: s.max,
            type: s.type,
            isActive: s.isActive,
            dripfeed: s.dripfeed,
            refill: s.refill,
            cancel: s.cancel,
            description: s.description,
            updatedAt: s.updatedAt,
          }));

      res.json({
        success: true,
        total: outputServices.length,
        categories: allCategories,
        platforms: allPlatforms,
        services: outputServices,
      });
    } catch (err: any) {
      console.error('Error fetching services:', err.message);
      res.status(500).json({ success: false, error: 'Failed to load services' });
    }
  }

  /**
   * Get service by internal ID or SMMFollows ID
   */
  public static async getServiceById(req: Request, res: Response): Promise<void> {
    try {
      const db = DatabaseService.getInstance();
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const service =
        (await db.getServiceByIdAsync(id)) ||
        (await db.getServiceByExternalIdAsync(parseInt(id, 10)));

      if (!service) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }

      const isAdmin = isRequesterAdmin(req);
      const safeService = isAdmin
        ? service
        : {
            id: service.id,
            externalId: service.externalId,
            name: service.name,
            category: service.category,
            platform: service.platform,
            customRate: service.customRate,
            min: service.min,
            max: service.max,
            type: service.type,
            isActive: service.isActive,
            dripfeed: service.dripfeed,
            refill: service.refill,
            cancel: service.cancel,
            description: service.description,
            updatedAt: service.updatedAt,
          };

      res.json({ success: true, service: safeService });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to find service' });
    }
  }

  /**
   * Force sync/refresh services directly from SMMFollows API
   */
  public static async syncServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (isSyncing) {
      res.status(429).json({ success: false, error: 'Sync already in progress. Please wait a moment.' });
      return;
    }

    isSyncing = true;
    try {
      const db = DatabaseService.getInstance();
      const markupPercent = req.body?.markupPercent
        ? parseFloat(req.body.markupPercent)
        : undefined;

      if (markupPercent !== undefined && !isNaN(markupPercent)) {
        await db.setSetting('default_markup_percent', markupPercent.toString(), false);
      }

      const freshServices = await db.getServicesAsync(true); // Force live reload from SMMFollows

      await db.logAudit(
        'SERVICES_SYNCED',
        `Synchronized ${freshServices.length} live services directly from SMMFollows provider`,
        req.ip || '127.0.0.1',
        req.user?.id,
        req.user?.username
      );

      res.json({
        success: true,
        message: `Successfully synchronized ${freshServices.length} services from SMMFollows`,
        totalServices: freshServices.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to sync services from provider' });
    } finally {
      isSyncing = false;
    }
  }
}
