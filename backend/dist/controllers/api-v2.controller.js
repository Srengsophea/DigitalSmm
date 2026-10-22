"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiV2Controller = void 0;
const db_service_1 = require("../services/db.service");
const smmfollows_service_1 = require("../services/smmfollows.service");
/**
 * Standard SMM Panel API v2 endpoint for resellers & automated bots
 * Resellers send POST to /api/v2 with { key, action, ... }
 */
class ApiV2Controller {
    static async handleApiV2(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
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
                const service = (await db.getServiceByExternalIdAsync(parseInt(serviceIdRaw, 10))) ||
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
                const freshUser = db.getUserById(user.id);
                if (!freshUser || freshUser.balance < charge) {
                    res.status(400).json({ error: 'Insufficient funds' });
                    return;
                }
                let providerResult;
                try {
                    providerResult = await smm.addOrder({
                        service: service.externalId,
                        link,
                        quantity,
                        runs: req.body.runs ? parseInt(req.body.runs, 10) : undefined,
                        interval: req.body.interval ? parseInt(req.body.interval, 10) : undefined,
                    });
                }
                catch (err) {
                    res.status(400).json({ error: err.message || 'Provider connection error' });
                    return;
                }
                if (!providerResult || !providerResult.order) {
                    res.status(400).json({ error: providerResult?.error || 'Provider rejection' });
                    return;
                }
                const debit = await db.adjustUserBalance(user.id, -charge, 'ORDER_CHARGE', undefined, `API Order: ${service.name} (Qty: ${quantity})`);
                if (!debit.success) {
                    res.status(400).json({ error: 'Insufficient funds' });
                    return;
                }
                const localOrder = await db.createOrder({
                    userId: user.id,
                    username: user.username,
                    serviceId: service.id,
                    externalServiceId: service.externalId,
                    externalOrderId: providerResult.order,
                    serviceName: service.name,
                    category: service.category,
                    platform: service.platform,
                    link,
                    quantity,
                    ratePerThousand: service.customRate,
                    charge,
                    originalCost,
                    profit,
                    status: 'PROCESSING',
                    providerResponse: JSON.stringify(providerResult.raw || {}),
                });
                res.json({ order: localOrder.id });
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
exports.ApiV2Controller = ApiV2Controller;
