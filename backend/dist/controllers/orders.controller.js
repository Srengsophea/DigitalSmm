"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const db_service_1 = require("../services/db.service");
const smmfollows_service_1 = require("../services/smmfollows.service");
class OrdersController {
    /**
     * Place an order with atomic balance deduction and automated provider dispatch
     */
    static async createOrder(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        const { serviceId, link, quantity, runs, interval } = req.body;
        const service = (await db.getServiceByIdAsync(serviceId)) ||
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
        // 1. Verify user exists and has enough funds BEFORE sending order to provider
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser || freshUser.balance < charge) {
            res.status(400).json({
                success: false,
                error: `Insufficient funds in your wallet. Required: $${charge.toFixed(3)}, Current balance: $${(freshUser?.balance || 0).toFixed(3)}. Please add funds.`,
                requiredCharge: charge,
                currentBalance: freshUser?.balance || 0,
            });
            return;
        }
        // 2. Dispatch to SMMFollows provider API BEFORE deducting any funds
        let providerResult;
        try {
            providerResult = await smm.addOrder({
                service: service.externalId,
                link,
                quantity,
                runs,
                interval,
            });
        }
        catch (netErr) {
            res.status(400).json({
                success: false,
                error: `Provider connection error: ${netErr.message || 'Failed to reach upstream server'}. No funds were deducted.`,
                currentBalance: freshUser.balance,
            });
            return;
        }
        // 3. Handle provider rejection: ZERO FUNDS ARE DEBITED!
        if (!providerResult || !providerResult.order) {
            const errorMsg = providerResult?.error || 'Provider rejected order';
            console.warn(`SMMFollows order dispatch rejected: ${errorMsg}`);
            await db.logAudit('ORDER_REJECTED', `Order for "${service.name.slice(0, 30)}" rejected by provider (${errorMsg}). No funds deducted from ${req.user.username}.`, req.ip || '127.0.0.1', req.user.id, req.user.username);
            res.status(400).json({
                success: false,
                error: `Provider error: ${errorMsg}. No funds were deducted from your wallet.`,
                currentBalance: freshUser.balance,
            });
            return;
        }
        // 4. Provider accepted! Now atomically debit user balance
        const debitResult = await db.adjustUserBalance(req.user.id, -charge, 'ORDER_CHARGE', undefined, `Order: ${service.name.slice(0, 40)} (Qty: ${quantity.toLocaleString()})`);
        if (!debitResult.success) {
            // Extremely rare race condition (concurrent order drained balance during provider call)
            try {
                await smm.cancelOrders([providerResult.order]);
            }
            catch (_) { }
            res.status(400).json({
                success: false,
                error: debitResult.error || 'Insufficient funds to finalize order charge.',
                requiredCharge: charge,
                currentBalance: freshUser.balance,
            });
            return;
        }
        // 5. Create local active order record
        const localOrder = await db.createOrder({
            userId: req.user.id,
            username: req.user.username,
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
            refill: service.refill,
            cancel: service.cancel,
            providerResponse: JSON.stringify(providerResult.raw || {}),
        });
        // Link transaction referenceId to localOrder.id
        const userTxs = db.getTransactionsByUserId(req.user.id);
        if (userTxs.length > 0 && userTxs[0].type === 'ORDER_CHARGE' && !userTxs[0].referenceId) {
            userTxs[0].referenceId = localOrder.id;
        }
        await db.logAudit('ORDER_PLACED', `Order #${localOrder.id.slice(0, 8)} placed on SMMFollows (#${providerResult.order}) for $${charge}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.status(201).json({
            success: true,
            message: 'Order placed successfully and forwarded to provider!',
            order: localOrder,
            newBalance: debitResult.newBalance,
        });
    }
    /**
     * Place mass orders (one per line: service_id | link | quantity)
     */
    static async createMassOrder(req, res) {
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
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        const results = [];
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
            let providerResult;
            try {
                providerResult = await smm.addOrder({
                    service: service.externalId,
                    link,
                    quantity,
                });
            }
            catch (err) {
                results.push({ line: i + 1, raw: line, success: false, error: err.message || 'Provider connection error' });
                continue;
            }
            if (providerResult && providerResult.order) {
                const debitResult = await db.adjustUserBalance(req.user.id, -charge, 'ORDER_CHARGE', undefined, `Mass Order: #${service.externalId} Qty: ${quantity}`);
                if (!debitResult.success) {
                    results.push({ line: i + 1, raw: line, success: false, error: debitResult.error });
                    continue;
                }
                const localOrder = await db.createOrder({
                    userId: req.user.id,
                    username: req.user.username,
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
                    refill: service.refill,
                    cancel: service.cancel,
                    providerResponse: JSON.stringify(providerResult.raw || {}),
                });
                results.push({ line: i + 1, raw: line, success: true, orderId: localOrder.id, externalOrderId: providerResult.order, charge });
                successfulCount++;
            }
            else {
                // Provider rejected: no deduction from user!
                results.push({ line: i + 1, raw: line, success: false, error: providerResult?.error || 'Provider rejected' });
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
    static async getMyOrders(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        let orders = db.getOrdersByUserId(req.user.id);
        // Auto-sync live status from SMMFollows provider for active orders on reload/fetch
        const activeOrders = orders.filter((o) => o.externalOrderId && !['COMPLETED', 'CANCELED'].includes(o.status));
        if (activeOrders.length > 0) {
            try {
                const extIds = activeOrders.map((o) => o.externalOrderId);
                // Process in chunks of 50 to avoid URL length issues with the provider
                for (let i = 0; i < extIds.length; i += 50) {
                    const chunk = extIds.slice(i, i + 50);
                    const multiStatus = await smm.getMultipleOrdersStatus(chunk);
                    if (multiStatus && typeof multiStatus === 'object') {
                        for (const order of activeOrders) {
                            const extId = order.externalOrderId.toString();
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
            catch (syncErr) {
                console.warn('Auto live-sync active orders warning:', syncErr.message);
            }
        }
        const { status, platform, search } = req.query;
        if (status && typeof status === 'string' && status.toUpperCase() !== 'ALL') {
            const target = status.toUpperCase().replace(/[\s-]+/g, '_');
            orders = orders.filter((o) => o.status.toUpperCase().replace(/[\s-]+/g, '_') === target);
        }
        if (platform && typeof platform === 'string' && platform.toUpperCase() !== 'ALL') {
            orders = orders.filter((o) => o.platform.toLowerCase() === platform.toLowerCase());
        }
        if (search && typeof search === 'string') {
            const q = search.toLowerCase();
            orders = orders.filter((o) => o.id.toLowerCase().includes(q) ||
                o.serviceName.toLowerCase().includes(q) ||
                o.link.toLowerCase().includes(q) ||
                (o.externalOrderId && o.externalOrderId.toString().includes(q)));
        }
        const servicesList = db.getServices();
        const serviceMap = new Map();
        servicesList.forEach((s) => {
            serviceMap.set(s.id, s);
            if (s.externalId)
                serviceMap.set(s.externalId.toString(), s);
        });
        const enrichedOrders = orders.map((o) => {
            let refill = o.refill;
            let cancel = o.cancel;
            if (refill === undefined || cancel === undefined) {
                const svc = serviceMap.get(o.serviceId) ||
                    (o.externalServiceId ? serviceMap.get(o.externalServiceId.toString()) : undefined);
                if (svc) {
                    if (refill === undefined)
                        refill = svc.refill;
                    if (cancel === undefined)
                        cancel = svc.cancel;
                }
            }
            return {
                ...o,
                refill: Boolean(refill),
                cancel: Boolean(cancel),
            };
        });
        res.json({
            success: true,
            total: enrichedOrders.length,
            orders: enrichedOrders,
        });
    }
    /**
     * Fetch live status from SMMFollows provider and update local DB
     */
    static async checkLiveStatus(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
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
            const updated = await OrdersController.processOrderStatusUpdate(order, statusRes);
            res.json({
                success: true,
                order: updated || order,
                providerStatus: statusRes,
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message || 'Failed to check status' });
        }
    }
    /**
     * Process provider status update, with automated refund handling for Canceled, Refunded, or Partial orders
     */
    static async processOrderStatusUpdate(order, statusRes) {
        const db = db_service_1.DatabaseService.getInstance();
        if (!statusRes || statusRes.error || !statusRes.status) {
            return null;
        }
        const mappedStatus = OrdersController.mapProviderStatus(statusRes.status);
        let isRefunded = Boolean(order.isRefunded);
        let refundAmount = order.refundAmount || 0;
        // 1. Full refund if provider canceled/refunded order and order was not already refunded
        if (mappedStatus === 'CANCELED' && !isRefunded && (order.charge || 0) > 0) {
            const refundVal = order.charge;
            const refRes = await db.adjustUserBalance(order.userId, refundVal, 'REFUND', order.id, `Automated refund for canceled order #${order.id.slice(0, 8)} (${order.serviceName.slice(0, 30)})`);
            if (refRes.success) {
                isRefunded = true;
                refundAmount = refundVal;
                await db.logAudit('ORDER_AUTO_REFUND', `Order #${order.id.slice(0, 8)} was canceled by provider. Auto-refunded $${refundVal} to ${order.username || order.userId}`, '127.0.0.1', order.userId, order.username);
            }
        }
        // 2. Partial refund if provider marked partial and order was not already refunded
        if (mappedStatus === 'PARTIAL' && !isRefunded && statusRes.remains !== undefined) {
            const remainsNum = parseInt(statusRes.remains.toString(), 10);
            if (!isNaN(remainsNum) && remainsNum > 0 && remainsNum <= order.quantity) {
                const partialRefund = Number(((remainsNum / 1000) * (order.ratePerThousand || 0)).toFixed(4));
                if (partialRefund > 0 && partialRefund <= (order.charge || 0)) {
                    const refRes = await db.adjustUserBalance(order.userId, partialRefund, 'REFUND', order.id, `Partial refund for order #${order.id.slice(0, 8)} (${remainsNum} remains)`);
                    if (refRes.success) {
                        isRefunded = true;
                        refundAmount = partialRefund;
                        await db.logAudit('ORDER_PARTIAL_REFUND', `Order #${order.id.slice(0, 8)} was partial (${remainsNum} remains). Auto-refunded $${partialRefund} to ${order.username || order.userId}`, '127.0.0.1', order.userId, order.username);
                    }
                }
            }
        }
        const updated = await db.updateOrder(order.id, {
            status: mappedStatus,
            startCount: statusRes.start_count ?? order.startCount,
            remains: statusRes.remains ?? order.remains,
            providerResponse: JSON.stringify(statusRes),
            isRefunded,
            refundAmount,
        });
        return updated;
    }
    static mapProviderStatus(rawStatus) {
        if (!rawStatus)
            return 'PROCESSING';
        const s = rawStatus.toLowerCase().replace(/[-_]/g, ' ');
        if (s.includes('completed') || s.includes('finished') || s.includes('complete'))
            return 'COMPLETED';
        if (s.includes('in progress'))
            return 'IN_PROGRESS';
        if (s.includes('processing'))
            return 'PROCESSING';
        if (s.includes('pending'))
            return 'PENDING';
        if (s.includes('partial'))
            return 'PARTIAL';
        if (s.includes('cancel'))
            return 'CANCELED';
        if (s.includes('refund'))
            return 'CANCELED';
        return 'PROCESSING';
    }
    /**
     * Request refill for an order on SMMFollows
     */
    static async refillOrder(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const order = db.getOrderById(id);
        if (!order) {
            res.status(404).json({ success: false, error: 'Order not found' });
            return;
        }
        if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
            res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
            return;
        }
        if (!order.externalOrderId) {
            res.status(400).json({ success: false, error: 'This order has no external provider reference' });
            return;
        }
        try {
            const refillResult = await smm.refillOrder(order.externalOrderId);
            if (refillResult.error) {
                res.status(400).json({ success: false, error: refillResult.error });
                return;
            }
            await db.logAudit('ORDER_REFILL', `Refill requested for order #${order.id.slice(0, 8)} (refill #${refillResult.refill})`, req.ip || '127.0.0.1', req.user.id, req.user.username);
            res.json({
                success: true,
                message: 'Refill requested successfully!',
                refillId: refillResult.refill,
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message || 'Failed to request refill' });
        }
    }
    /**
     * Request cancellation for an order on SMMFollows
     */
    static async cancelOrder(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const smm = smmfollows_service_1.SMMFollowsService.getInstance();
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const order = db.getOrderById(id);
        if (!order) {
            res.status(404).json({ success: false, error: 'Order not found' });
            return;
        }
        if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
            res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
            return;
        }
        if (!order.externalOrderId) {
            res.status(400).json({ success: false, error: 'This order has no external provider reference' });
            return;
        }
        try {
            const cancelResult = await smm.cancelOrders([order.externalOrderId]);
            if (Array.isArray(cancelResult) && cancelResult.length > 0) {
                const item = cancelResult[0];
                if (item.cancel && item.cancel.error) {
                    res.status(400).json({ success: false, error: item.cancel.error });
                    return;
                }
            }
            await db.logAudit('ORDER_CANCEL_REQUEST', `Cancellation requested for order #${order.id.slice(0, 8)}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
            res.json({
                success: true,
                message: 'Cancellation requested successfully from provider!',
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message || 'Failed to request cancellation' });
        }
    }
}
exports.OrdersController = OrdersController;
