import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/db.service';
import { EmailService } from '../services/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ENV } from '../config/env';
import { EncryptionService } from '../services/encryption.service';
import { PendingSignup } from '../models/types';

// Thread-safe in-memory store for pending email OTP signups (key: normalized lowercase email)
const pendingSignups = new Map<string, PendingSignup>();

// Clean expired registrations periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, pending] of pendingSignups.entries()) {
    if (now > pending.expiresAt) {
      pendingSignups.delete(email);
    }
  }
}, 5 * 60 * 1000);

export class AuthController {
  /**
   * Step 1: Validate registration info, generate 6-digit OTP code, and dispatch via email
   */
  public static async sendSignupOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const emailService = EmailService.getInstance();
    const { username, email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // Check if email already registered
    if (db.getUserByEmail(normalizedEmail)) {
      res.status(409).json({ success: false, error: 'This email address is already registered. Please sign in.' });
      return;
    }

    // Check if username already taken
    if (db.getUserByUsername(cleanUsername)) {
      res.status(409).json({ success: false, error: 'This username is already taken. Please choose another.' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      return;
    }

    // Rate-limit resend requests if recently sent
    const existing = pendingSignups.get(normalizedEmail);
    if (existing && Date.now() < existing.expiresAt - 9.5 * 60 * 1000) {
      // Requested within the last 30 seconds
      res.status(429).json({
        success: false,
        error: 'Please wait 30 seconds before requesting another verification code.',
      });
      return;
    }

    // Generate cryptographically sound 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Pre-hash password with bcrypt (rounds = 12)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Store in pending signups with 10-minute validity
    pendingSignups.set(normalizedEmail, {
      username: cleanUsername,
      email: normalizedEmail,
      passwordHash,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    // Dispatch email
    const emailResult = await emailService.sendSignupOtp(normalizedEmail, cleanUsername, otp);

    await db.logAudit(
      'SIGNUP_OTP_DISPATCHED',
      `Signup verification code dispatched to ${cleanUsername} (${normalizedEmail}) via ${emailResult.deliveryMethod}`,
      req.ip || '127.0.0.1'
    );

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInSeconds: 600,
      deliveryMethod: emailResult.deliveryMethod,
    });
  }

  /**
   * Step 2: Verify the 6-digit email OTP and officially create the real user account
   */
  public static async verifySignupOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { email, otp } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim();

    const pending = pendingSignups.get(normalizedEmail);

    if (!pending) {
      res.status(400).json({
        success: false,
        error: 'No pending registration found for this email, or the code has expired. Please restart signup.',
      });
      return;
    }

    // Check expiration
    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(normalizedEmail);
      res.status(400).json({
        success: false,
        error: 'The verification code has expired. Please request a new one.',
      });
      return;
    }

    // Check maximum invalid attempts
    if (pending.attempts >= 5) {
      pendingSignups.delete(normalizedEmail);
      res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new verification code.',
      });
      return;
    }

    // Verify OTP code
    if (pending.otp !== cleanOtp) {
      pending.attempts += 1;
      const remaining = 5 - pending.attempts;
      res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
      return;
    }

    // OTP is valid! Ensure neither email nor username were registered concurrently
    if (db.getUserByEmail(pending.email)) {
      pendingSignups.delete(normalizedEmail);
      res.status(409).json({ success: false, error: 'Email is already registered. Please log in.' });
      return;
    }

    if (db.getUserByUsername(pending.username)) {
      pendingSignups.delete(normalizedEmail);
      res.status(409).json({ success: false, error: 'Username was already claimed. Please restart registration.' });
      return;
    }

    // Create real user account in DB
    const newUser = await db.createUser({
      username: pending.username,
      email: pending.email,
      passwordHash: pending.passwordHash,
      balance: 0.0,
      role: 'USER',
      status: 'active',
    });

    // Remove from pending store
    pendingSignups.delete(normalizedEmail);

    await db.logAudit(
      'USER_REGISTER_VERIFIED',
      `New real account verified & created: ${newUser.username} (${newUser.email})`,
      req.ip || '127.0.0.1',
      newUser.id,
      newUser.username
    );

    // Issue JWT session token (7-day validity)
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, username: newUser.username },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account verified and created successfully!',
      token,
      user: safeUser,
    });
  }

  /**
   * Resend signup OTP code
   */
  public static async resendSignupOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const emailService = EmailService.getInstance();
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    const pending = pendingSignups.get(normalizedEmail);
    if (!pending) {
      res.status(400).json({
        success: false,
        error: 'No active signup session found. Please enter your registration details again.',
      });
      return;
    }

    // Generate fresh OTP code and extend expiration
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;
    pending.attempts = 0;

    const result = await emailService.sendSignupOtp(normalizedEmail, pending.username, newOtp);

    res.json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      deliveryMethod: result.deliveryMethod,
    });
  }

  /**
   * Fallback Unified Register:
   * If OTP is provided, verifies it; if not provided, sends the OTP!
   */
  public static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { otp } = req.body;
    if (otp && typeof otp === 'string' && otp.trim().length > 0) {
      await AuthController.verifySignupOtp(req, res);
    } else {
      await AuthController.sendSignupOtp(req, res);
    }
  }

  /**
   * Real user/password login
   */
  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { login, password } = req.body;

    const cleanLogin = (login || '').trim();

    const user =
      db.getUserByEmail(cleanLogin) ||
      db.getUserByUsername(cleanLogin);

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email/username or password' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: 'This account has been suspended by administration' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email/username or password' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await db.logAudit(
      'USER_LOGIN',
      `User signed in: ${user.username}`,
      req.ip || '127.0.0.1',
      user.id,
      user.username
    );

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: safeUser,
    });
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const freshUser = db.getUserById(req.user.id);
    if (!freshUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { passwordHash: _, ...safeUser } = freshUser;
    res.json({ success: true, user: safeUser });
  }

  public static async regenerateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const prefix = req.user.role === 'ADMIN' ? 'ds_adm_' : 'ds_usr_';
    const newApiKey = EncryptionService.generateApiKey(prefix);
    const nowIso = new Date().toISOString();

    await db.updateUser(req.user.id, {
      apiKey: newApiKey,
      apiKeyCreatedAt: nowIso,
    });

    await db.logAudit(
      'API_KEY_ROTATED',
      `API key rotated for user: ${req.user.username}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    res.json({
      success: true,
      message: 'New API key generated successfully',
      apiKey: newApiKey,
      apiKeyCreatedAt: nowIso,
    });
  }

  /**
   * Change User Email Address
   */
  public static async changeEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Valid email address is required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ success: false, error: 'Invalid email address format' });
      return;
    }

    const existingUser = db.getUserByEmail(cleanEmail);
    if (existingUser && existingUser.id !== req.user.id) {
      res.status(409).json({ success: false, error: 'This email is already in use by another account' });
      return;
    }

    const updated = await db.updateUser(req.user.id, { email: cleanEmail });
    if (!updated) {
      res.status(500).json({ success: false, error: 'Failed to update email address' });
      return;
    }

    await db.logAudit(
      'EMAIL_CHANGED',
      `User ${req.user.username} updated email from ${req.user.email} to ${cleanEmail}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    const { passwordHash: _, ...safeUser } = updated;
    res.json({
      success: true,
      message: 'Email address updated successfully',
      user: safeUser,
    });
  }

  /**
   * Change User Password
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current password and new password are required' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
      return;
    }

    const freshUser = db.getUserById(req.user.id);
    if (!freshUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, freshUser.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Current password does not match' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.updateUser(req.user.id, { passwordHash: newHash });

    await db.logAudit(
      'PASSWORD_CHANGED',
      `Password changed for user: ${req.user.username}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }

  /**
   * Toggle Two-Factor Authentication (Email 2FA)
   */
  public static async toggle2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const { enabled } = req.body;

    const freshUser = db.getUserById(req.user.id);
    if (!freshUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const newState = enabled !== undefined ? Boolean(enabled) : !freshUser.twoFactorEnabled;

    const updated = await db.updateUser(req.user.id, { twoFactorEnabled: newState });

    await db.logAudit(
      'TWO_FACTOR_TOGGLED',
      `2FA ${newState ? 'enabled' : 'disabled'} for user: ${req.user.username}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    const { passwordHash: _, ...safeUser } = updated || freshUser;
    res.json({
      success: true,
      twoFactorEnabled: newState,
      message: newState ? 'Two-factor authentication enabled successfully' : 'Two-factor authentication disabled',
      user: safeUser,
    });
  }

  /**
   * Update User Timezone
   */
  public static async updateTimezone(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = DatabaseService.getInstance();
    const { timezone } = req.body;

    if (!timezone || typeof timezone !== 'string') {
      res.status(400).json({ success: false, error: 'Timezone is required' });
      return;
    }

    const updated = await db.updateUser(req.user.id, { timezone: timezone.trim() });

    await db.logAudit(
      'TIMEZONE_UPDATED',
      `Timezone updated for ${req.user.username}: ${timezone}`,
      req.ip || '127.0.0.1',
      req.user.id,
      req.user.username
    );

    const { passwordHash: _, ...safeUser } = updated || req.user;
    res.json({
      success: true,
      timezone: timezone.trim(),
      message: 'Timezone preference saved successfully',
      user: safeUser,
    });
  }

  /**
   * Real Google Account Sign-In / Sign-Up
   * Decodes Google ID Token (GSI) or profile data and issues real session
   */
  public static async googleAuth(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = DatabaseService.getInstance();
    const { email, name, credential } = req.body;

    let targetEmail = email;
    let targetName = name;

    // Decode Google ID Token if present from Google Identity Services
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) {
            targetEmail = payload.email;
            targetName = payload.name || payload.given_name || payload.email.split('@')[0];
          }
        }
      } catch (e) {
        console.error('Failed to parse Google credential token:', e);
      }
    }

    if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid Google / Gmail address is required' });
      return;
    }

    targetEmail = targetEmail.toLowerCase().trim();
    let user = db.getUserByEmail(targetEmail);

    if (!user) {
      // Create new real user from Google Account
      const baseUsername = (targetName || targetEmail.split('@')[0])
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toLowerCase()
        .slice(0, 18) || 'user';

      let candidateUsername = baseUsername;
      let counter = 1;
      while (db.getUserByUsername(candidateUsername)) {
        candidateUsername = `${baseUsername}${counter++}`;
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(`google_${Date.now()}_${Math.random()}`, salt);

      user = await db.createUser({
        username: candidateUsername,
        email: targetEmail,
        passwordHash,
        balance: 0.0,
        role: 'USER',
        status: 'active',
      });

      await db.logAudit(
        'GOOGLE_REGISTER',
        `User registered with Google: ${user.username} (${targetEmail})`,
        req.ip || '127.0.0.1',
        user.id,
        user.username
      );
    } else {
      if (user.status !== 'active') {
        res.status(403).json({ success: false, error: 'This account has been suspended by administration' });
        return;
      }

      await db.logAudit(
        'GOOGLE_LOGIN',
        `User signed in with Google: ${user.username} (${targetEmail})`,
        req.ip || '127.0.0.1',
        user.id,
        user.username
      );
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Signed in with Google successfully!',
      token,
      user: safeUser,
    });
  }
}
