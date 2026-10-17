import { Request, Response } from 'express';
import { DatabaseService } from '../services/db.service';
import { OrdersController } from './orders.controller';
import { SMMFollowsService } from '../services/smmfollows.service';

/**
 * Standard SMM Panel API v2 endpoint for resellers & automated bots
 * Resellers send POST to /api/v2 with { key, action, ... }
 */
export class ApiV2Controller {
  public static async handleApiV2(req: Request, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();

    const key = req.body.key || req.query.key;
    const action = req.body.action || req.query.action;

    if (!key || typeof key !== 'string') {
      res.status(401).json({ error: 'Missing or invalid API key' });
      return;
    }

    const user = db.getUserByApiKey(key);
    if (!user) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    switch (action) {
      case 'balance': {
        res.json({
          balance: user.balance.toFixed(4),
          currency: 'USD',
        });
        return;
      }

      case 'services': {
        const allServices = await db.getServicesAsync();
        const services = allServices.filter((s) => s.isActive);
        const formatted = services.map((s) => ({
          service: s.externalId,
          name: s.name,
          type: s.type,
          category: s.category,
          rate: s.customRate.toString(),
          min: s.min,
          max: s.max,
          dripfeed: s.dripfeed,
          refill: s.refill,
          cancel: s.cancel,
        }));
        res.json(formatted);
        return;
      }

      case 'add': {
        const serviceIdRaw = req.body.service;
        const link = req.body.link;
        const quantity = parseInt(req.body.quantity, 10);

        if (!serviceIdRaw || !link || isNaN(quantity)) {
          res.status(400).json({ error: 'service, link, and quantity are required' });
          return;
        }

        const service =
          (await db.getServiceByExternalIdAsync(parseInt(serviceIdRaw, 10))) ||
          (await db.getServiceByIdAsync(serviceIdRaw.toString()));

        if (!service || !service.isActive) {
          res.status(400).json({ error: 'Invalid or inactive service ID' });
          return;
        }

        if (quantity < service.min || quantity > service.max) {
          res.status(400).json({ error: `Quantity must be between ${service.min} and ${service.max}` });
          return;
        }

        const charge = Number(((quantity / 1000) * service.customRate).toFixed(4));
        const originalCost = Number(((quantity / 1000) * service.originalRate).toFixed(4));
        const profit = Number((charge - originalCost).toFixed(4));

        const debit = await db.adjustUserBalance(
          user.id,
          -charge,
          'ORDER_CHARGE',
          undefined,
          `API Order: ${service.name} (Qty: ${quantity})`
        );

        if (!debit.success) {
          res.status(400).json({ error: 'Insufficient funds' });
          return;
        }

        const localOrder = await db.createOrder({
          userId: user.id,
          username: user.username,
          serviceId: service.id,
          externalServiceId: service.externalId,
          serviceName: service.name,
          category: service.category,
          platform: service.platform,
          link,
          quantity,
          ratePerThousand: service.customRate,
          charge,
          originalCost,
          profit,
          status: 'PENDING',
        });

        const providerResult = await smm.addOrder({
          service: service.externalId,
          link,
          quantity,
          runs: req.body.runs ? parseInt(req.body.runs, 10) : undefined,
          interval: req.body.interval ? parseInt(req.body.interval, 10) : undefined,
        });

        if (providerResult.order) {
          await db.updateOrder(localOrder.id, {
            externalOrderId: providerResult.order,
            status: 'PROCESSING',
          });
          res.json({ order: localOrder.id });
          return;
        }

        // Refund user if provider fails
        await db.adjustUserBalance(user.id, charge, 'REFUND', localOrder.id, 'API Order Refund');
        await db.updateOrder(localOrder.id, { status: 'CANCELED', providerResponse: providerResult.error });
        res.status(400).json({ error: providerResult.error || 'Provider rejection' });
        return;
      }

      case 'status': {
        const orderId = req.body.order;
        if (!orderId) {
          res.status(400).json({ error: 'Missing order parameter' });
          return;
        }

        const order = db.getOrderById(orderId.toString()) || db.getOrders().find(o => o.externalOrderId == orderId);
        if (!order || order.userId !== user.id) {
          res.status(404).json({ error: 'Order not found' });
          return;
        }

        res.json({
          charge: order.charge.toString(),
          start_count: order.startCount?.toString() || '0',
          status: order.status,
          remains: order.remains?.toString() || '0',
          currency: 'USD',
        });
        return;
      }

      default:
        res.status(400).json({ error: 'Invalid action. Supported: balance, services, add, status' });
    }
  }
}
