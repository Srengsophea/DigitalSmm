import { Response } from 'express';
import { DatabaseService } from '../services/db.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TicketsController {
  public static async getMyTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const db = DatabaseService.getInstance();
    const tickets = db.getTicketsByUserId(req.user.id);

    res.json({
      success: true,
      total: tickets.length,
      tickets,
    });
  }

  public static async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { subjectType, subType, orderIds, message, referralSource } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Message description is required' });
      return;
    }

    if (message.trim().length > 4000) {
      res.status(400).json({ success: false, error: 'Ticket message cannot exceed 4000 characters' });
      return;
    }

    if (orderIds && typeof orderIds === 'string' && orderIds.trim().length > 500) {
      res.status(400).json({ success: false, error: 'Order IDs field is too long (max 500 characters)' });
      return;
    }

    const db = DatabaseService.getInstance();
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

    await db.logAudit(
      'TICKET_CREATED',
      `Ticket #${newTicket.ticketNumber} created by ${req.user.username}: ${subjectType}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    res.status(201).json({
      success: true,
      message: `Ticket #${newTicket.ticketNumber} submitted successfully!`,
      ticket: newTicket,
    });
  }

  public static async getAllTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Administrative clearance required' });
      return;
    }

    const db = DatabaseService.getInstance();
    const tickets = db.getTickets();

    res.json({
      success: true,
      total: tickets.length,
      tickets,
    });
  }
}
