"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const db_service_1 = require("../services/db.service");
const bakong_service_1 = require("../services/bakong.service");
class WalletController {
    /**
     * Get current user balance and stats
     */
    static async getBalance(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const user = db.getUserById(req.user.id);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const orders = db.getOrdersByUserId(user.id);
        const totalSpent = orders
            .filter((o) => o.status !== 'CANCELED')
            .reduce((sum, o) => sum + o.charge, 0);
        res.json({
            success: true,
            balance: user.balance,
            totalOrders: orders.length,
            totalSpent: Number(totalSpent.toFixed(2)),
            accountPoints: 0,
            statusTier: user.role === 'ADMIN' ? 'VIP Admin' : 'New',
        });
    }
    /**
     * Top-up balance (Standard simulated payment gateways)
     */
    static async deposit(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { amount, method } = req.body;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 1) {
            res.status(400).json({ success: false, error: 'Minimum deposit is $1.00' });
            return;
        }
        const paymentReference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const result = await db.adjustUserBalance(req.user.id, numAmount, 'DEPOSIT', paymentReference, `Deposit via ${method || 'Instant Payment Gateway'}`);
        if (!result.success) {
            res.status(500).json({ success: false, error: result.error || 'Failed to credit balance' });
            return;
        }
        await db.logAudit('DEPOSIT_COMPLETED', `Deposit of $${numAmount.toFixed(2)} completed via ${method} (Ref: ${paymentReference})`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.json({
            success: true,
            message: `Successfully added $${numAmount.toFixed(2)} to your balance!`,
            newBalance: result.newBalance,
            reference: paymentReference,
        });
    }
    /**
     * Generate Bakong KHQR for Cambodia banks (ABA, Wing, ACLEDA, etc.)
     */
    static async generateKhqr(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const { amount, currency = 'USD' } = req.body;
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 1) {
            res.status(400).json({ success: false, error: 'Minimum deposit is $1.00 USD' });
            return;
        }
        const bakong = bakong_service_1.BakongService.getInstance();
        const billNumber = `KHQR${Date.now().toString().slice(-6)}`;
        try {
            const khqrRes = await bakong.generateKHQR({
                amount: numAmount,
                currency: currency,
                billNumber,
                storeLabel: 'DigitalSMM',
            });
            res.json({
                success: true,
                data: {
                    md5: khqrRes.data.md5,
                    qrString: khqrRes.data.qrString,
                    qrImage: khqrRes.data.qrImage,
                    deeplink: khqrRes.data.deeplink,
                    accountId: khqrRes.data.accountId,
                    merchantName: khqrRes.data.merchantName,
                    merchantCity: khqrRes.data.merchantCity,
                    amount: numAmount,
                    currency,
                    billNumber,
                },
            });
        }
        catch (err) {
            console.error('Bakong KHQR generation error:', err);
            res.status(500).json({
                success: false,
                error: `Failed to generate genuine Bakong KHQR: ${err.message}`,
            });
        }
    }
    /**
     * Verify Bakong KHQR settlement by MD5 hash
     */
    static async verifyKhqr(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { md5, amount } = req.body;
        if (!md5) {
            res.status(400).json({ success: false, error: 'MD5 hash required' });
            return;
        }
        const numAmount = parseFloat(amount) || 5.0;
        const bakong = bakong_service_1.BakongService.getInstance();
        // Check if this payment was already credited (prevent double-credit)
        const userTransactions = db.getTransactionsByUserId(req.user.id);
        const alreadyCredited = userTransactions.some((tx) => tx.referenceId === md5);
        if (alreadyCredited) {
            const refreshedUser = db.getUserById(req.user.id);
            res.json({
                success: true,
                confirmed: true,
                alreadyProcessed: true,
                message: 'Payment has already been credited to your wallet.',
                newBalance: refreshedUser?.balance ?? req.user.balance,
            });
            return;
        }
        try {
            const checkRes = await bakong.checkPayment(md5);
            if (checkRes.responseCode === 0) {
                // Real payment confirmed on Bakong network!
                const creditAmount = checkRes.data?.amount ? Number(checkRes.data.amount) : numAmount;
                const creditResult = await db.adjustUserBalance(req.user.id, creditAmount, 'DEPOSIT', md5, `Bakong KHQR to ${bakong.getAccountId()} (MD5: ${md5.slice(0, 10)})`);
                await db.logAudit('KHQR_PAYMENT_CONFIRMED', `Bakong payment of $${creditAmount.toFixed(2)} confirmed & credited to ${req.user.username} (MD5: ${md5})`, req.ip || '127.0.0.1', req.user.id, req.user.username);
                res.json({
                    success: true,
                    confirmed: true,
                    message: 'Payment confirmed by Bakong network! Balance credited.',
                    newBalance: creditResult.newBalance,
                });
                return;
            }
            // Not yet paid/confirmed in Bakong network
            res.json({
                success: true,
                confirmed: false,
                message: 'Payment pending in Bakong network. Please approve the payment in your banking app.',
            });
        }
        catch (err) {
            // Real check failed or still pending; do NOT credit fake balance
            res.json({
                success: true,
                confirmed: false,
                message: 'Payment is pending verification in the NBC Bakong network. Please ensure payment is submitted.',
            });
        }
    }
    /**
     * Get transaction history for authenticated user
     */
    static async getTransactions(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const transactions = db.getTransactionsByUserId(req.user.id);
        res.json({
            success: true,
            total: transactions.length,
            transactions,
        });
    }
}
exports.WalletController = WalletController;
