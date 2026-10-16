"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsController = void 0;
const db_service_1 = require("../services/db.service");
class TicketsController {
    static async getMyTickets(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const tickets = db.getTicketsByUserId(req.user.id);
        res.json({
            success: true,
            total: tickets.length,
            tickets,
        });
    }
    static async createTicket(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const { subjectType, subType, orderIds, message, referralSource } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Message description is required' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const newTicket = await db.createTicket({
            userId: req.user.id,
            username: req.user.username,
            subjectType: subjectType || 'Orders',
            subType,
            orderIds: orderIds?.trim(),
            message: message.trim(),
            referralSource: referralSource?.trim(),
            status: 'New',
        });
        await db.logAudit('TICKET_CREATED', `Ticket #${newTicket.ticketNumber} created by ${req.user.username}: ${subjectType}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.status(201).json({
            success: true,
            message: `Ticket #${newTicket.ticketNumber} submitted successfully!`,
            ticket: newTicket,
        });
    }
    static async getAllTickets(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const tickets = db.getTickets();
        res.json({
            success: true,
            total: tickets.length,
            tickets,
        });
    }
}
exports.TicketsController = TicketsController;
