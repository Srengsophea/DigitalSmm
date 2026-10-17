import { Response } from 'express';
import { DatabaseService } from '../services/db.service';
import { SMMFollowsService } from '../services/smmfollows.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { OrderStatus } from '../models/types';

export class OrdersController {
  /**
   * Place an order with atomic balance deduction and automated provider dispatch
   */
  public static async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();
    const { serviceId, link, quantity, runs, interval } = req.body;

    const service =
      (await db.getServiceByIdAsync(serviceId)) ||
      (await db.getServiceByExternalIdAsync(parseInt(serviceId, 10)));

    if (!service) {
      res.status(404).json({ success: false, error: 'Selected service does not exist' });
      return;
    }

    if (!service.isActive) {
      res.status(400).json({ success: false, error: 'This service is currently disabled' });
      return;
    }

    if (quantity < service.min) {
      res.status(400).json({
        success: false,
        error: `Minimum order quantity for this service is ${service.min.toLocaleString()}`,
      });
      return;
    }

    if (quantity > service.max) {
      res.status(400).json({
        success: false,
        error: `Maximum order quantity for this service is ${service.max.toLocaleString()}`,
      });
      return;
    }

    const charge = Number(((quantity / 1000) * service.customRate).toFixed(4));
    const originalCost = Number(((quantity / 1000) * service.originalRate).toFixed(4));
    const profit = Number((charge - originalCost).toFixed(4));

    // 1. Atomically deduct funds from user's balance
    const debitResult = await db.adjustUserBalance(
      req.user.id,
      -charge,
      'ORDER_CHARGE',
      undefined,
      `Order: ${service.name.slice(0, 40)} (Qty: ${quantity.toLocaleString()})`
    );

    if (!debitResult.success) {
      res.status(400).json({
        success: false,
        error: debitResult.error || 'Insufficient funds in your wallet. Please add funds.',
        requiredCharge: charge,
        currentBalance: req.user.balance,
      });
      return;
    }

    // 2. Create local pending order record
    const localOrder = await db.createOrder({
      userId: req.user.id,
      username: req.user.username,
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

    // 3. Dispatch to SMMFollows provider API
    const providerResult = await smm.addOrder({
      service: service.externalId,
      link,
      quantity,
      runs,
      interval,
    });

    // 4. Handle provider response
    if (providerResult.order) {
      // Order accepted by SMMFollows!
      const updatedOrder = await db.updateOrder(localOrder.id, {
        externalOrderId: providerResult.order,
        status: 'PROCESSING',
        providerResponse: JSON.stringify(providerResult.raw || {}),
      });

      await db.logAudit(
        'ORDER_PLACED',
        `Order #${localOrder.id.slice(0, 8)} placed on SMMFollows (#${providerResult.order}) for $${charge}`,
        req.ip || '127.0.0.1',
        req.user.id,
        req.user.username
      );

      res.status(201).json({
        success: true,
        message: 'Order placed successfully and forwarded to provider!',
        order: updatedOrder,
        newBalance: debitResult.newBalance,
      });
      return;
    }

    // Provider rejected the order: instantly refund the user!
    console.warn(`SMMFollows order dispatch rejected: ${providerResult.error}`);

    await db.adjustUserBalance(
      req.user.id,
      charge,
      'REFUND',
      localOrder.id,
      `Refund for failed order: ${providerResult.error || 'Provider rejection'}`
    );

    const refundedOrder = await db.updateOrder(localOrder.id, {
      status: 'CANCELED',
      providerResponse: providerResult.error || 'Provider dispatch error',
    });

    await db.logAudit(
      'ORDER_REFUNDED',
      `Order #${localOrder.id.slice(0, 8)} failed (${providerResult.error}). $${charge} refunded to ${req.user.username}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    res.status(400).json({
      success: false,
      error: `Provider error: ${providerResult.error || 'Failed to place order'}. Your wallet was refunded $${charge.toFixed(2)}.`,
      order: refundedOrder,
      newBalance: debitResult.newBalance + charge,
    });
  }

  /**
   * Place mass orders (one per line: service_id | link | quantity)
   */
  public static async createMassOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { massOrderData } = req.body;
    if (!massOrderData || typeof massOrderData !== 'string') {
      res.status(400).json({ success: false, error: 'Mass order data required in format: service_id | link | quantity' });
      return;
    }

    const lines = massOrderData.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      res.status(400).json({ success: false, error: 'No order lines found' });
      return;
    }

    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();
    const results: any[] = [];
    let successfulCount = 0;
    const allServices = await db.getServicesAsync();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) {
        results.push({ line: i + 1, raw: line, success: false, error: 'Invalid format. Use service_id | link | quantity' });
        continue;
      }

      const serviceIdRaw = parts[0];
      const link = parts[1];
      const quantity = parseInt(parts[2], 10);

      const numId = parseInt(serviceIdRaw, 10);
      const service = allServices.find((s) => s.id === serviceIdRaw || (!isNaN(numId) && s.externalId === numId));

      if (!service || !service.isActive) {
        results.push({ line: i + 1, raw: line, success: false, error: `Service #${serviceIdRaw} not found or inactive` });
        continue;
      }

      if (quantity < service.min || quantity > service.max) {
        results.push({ line: i + 1, raw: line, success: false, error: `Quantity must be between ${service.min} and ${service.max}` });
        continue;
      }

      const charge = Number(((quantity / 1000) * service.customRate).toFixed(4));
      const originalCost = Number(((quantity / 1000) * service.originalRate).toFixed(4));
      const profit = Number((charge - originalCost).toFixed(4));

      const freshUser = db.getUserById(req.user.id);
      if (!freshUser || freshUser.balance < charge) {
        results.push({ line: i + 1, raw: line, success: false, error: 'Insufficient funds for this line item' });
        continue;
      }

      const debitResult = await db.adjustUserBalance(
        req.user.id,
        -charge,
        'ORDER_CHARGE',
        undefined,
        `Mass Order: #${service.externalId} Qty: ${quantity}`
      );

      if (!debitResult.success) {
        results.push({ line: i + 1, raw: line, success: false, error: debitResult.error });
        continue;
      }

      const localOrder = await db.createOrder({
        userId: req.user.id,
        username: req.user.username,
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
      });

      if (providerResult.order) {
        await db.updateOrder(localOrder.id, {
          externalOrderId: providerResult.order,
          status: 'PROCESSING',
          providerResponse: JSON.stringify(providerResult.raw || {}),
        });
        results.push({ line: i + 1, raw: line, success: true, orderId: localOrder.id, externalOrderId: providerResult.order, charge });
        successfulCount++;
      } else {
        await db.adjustUserBalance(req.user.id, charge, 'REFUND', localOrder.id, 'Mass order refund');
        await db.updateOrder(localOrder.id, { status: 'CANCELED', providerResponse: providerResult.error });
        results.push({ line: i + 1, raw: line, success: false, error: providerResult.error || 'Provider rejected' });
      }
    }

    const finalUser = db.getUserById(req.user.id);

    res.json({
      success: true,
      totalLines: lines.length,
      successfulCount,
      failedCount: lines.length - successfulCount,
      results,
      newBalance: finalUser?.balance || 0,
    });
  }

  /**
   * Get orders for authenticated user
   */
  public static async getMyOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const db = DatabaseService.getInstance();
    let orders = db.getOrdersByUserId(req.user.id);

    const { status, platform, search } = req.query;

    if (status && typeof status === 'string' && status !== 'ALL') {
      orders = orders.filter((o) => o.status.toUpperCase() === status.toUpperCase());
    }

    if (platform && typeof platform === 'string' && platform !== 'ALL') {
      orders = orders.filter((o) => o.platform.toLowerCase() === platform.toLowerCase());
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.serviceName.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q) ||
          (o.externalOrderId && o.externalOrderId.toString().includes(q))
      );
    }

    res.json({
      success: true,
      total: orders.length,
      orders,
    });
  }

  /**
   * Fetch live status from SMMFollows provider and update local DB
   */
  public static async checkLiveStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const smm = SMMFollowsService.getInstance();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const order = db.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Only owner or admin can check order
    if (req.user?.role !== 'ADMIN' && order.userId !== req.user?.id) {
      res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
      return;
    }

    if (!order.externalOrderId) {
      res.json({ success: true, order });
      return;
    }

    try {
      const statusRes = await smm.getOrderStatus(order.externalOrderId);

      if (statusRes.error) {
        res.status(400).json({ success: false, error: statusRes.error });
        return;
      }

      const mappedStatus: OrderStatus = OrdersController.mapProviderStatus(statusRes.status);

      const updated = await db.updateOrder(order.id, {
        status: mappedStatus,
        startCount: statusRes.start_count,
        remains: statusRes.remains,
        providerResponse: JSON.stringify(statusRes),
      });

      res.json({
        success: true,
        order: updated,
        providerStatus: statusRes,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to check status' });
    }
  }

  private static mapProviderStatus(rawStatus?: string): OrderStatus {
    if (!rawStatus) return 'PROCESSING';
    const s = rawStatus.toLowerCase();
    if (s.includes('completed') || s.includes('finished')) return 'COMPLETED';
    if (s.includes('in progress')) return 'IN_PROGRESS';
    if (s.includes('processing')) return 'PROCESSING';
    if (s.includes('pending')) return 'PENDING';
    if (s.includes('partial')) return 'PARTIAL';
    if (s.includes('cancel')) return 'CANCELED';
    return 'PROCESSING';
  }
}
