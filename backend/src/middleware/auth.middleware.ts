import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { DatabaseService } from '../services/db.service';
import { User } from '../models/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const db = DatabaseService.getInstance();
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  // 1. Check API Key header first (for API v2 or reseller clients)
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    const user = db.getUserByApiKey(apiKeyHeader);
    if (user && user.status === 'active') {
      req.user = user;
      return next();
    }
    res.status(401).json({ success: false, error: 'Invalid or inactive API key' });
    return;
  }

  // 2. Check Bearer JWT token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      userId: string;
      role: string;
      tokenVersion?: number;
    };
    const user = db.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found or session revoked' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: 'Account has been suspended' });
      return;
    }

    // Dynamic Session Revocation: Reject older JWTs if tokenVersion was incremented on password change
    if (user.tokenVersion && decoded.tokenVersion !== undefined && decoded.tokenVersion < user.tokenVersion) {
      res.status(401).json({
        success: false,
        error: 'Session has been revoked due to credential changes. Please sign in again.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'Session expired or invalid token' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Admin privileges required' });
    return;
  }

  next();
};
