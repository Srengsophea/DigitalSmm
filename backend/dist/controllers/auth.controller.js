"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_service_1 = require("../services/db.service");
const email_service_1 = require("../services/email.service");
const env_1 = require("../config/env");
const encryption_service_1 = require("../services/encryption.service");
const totp_service_1 = require("../services/totp.service");
// Thread-safe in-memory store for pending email OTP signups (key: normalized lowercase email)
const pendingSignups = new Map();
const pendingEmailChanges = new Map();
const pending2FASetups = new Map();
const pendingPasswordResets = new Map();
// Clean expired registrations and pending security requests periodically
setInterval(() => {
    const now = Date.now();
    for (const [email, pending] of pendingSignups.entries()) {
        if (now > pending.expiresAt) {
            pendingSignups.delete(email);
        }
    }
    for (const [uid, pending] of pendingEmailChanges.entries()) {
        if (now > pending.expiresAt) {
            pendingEmailChanges.delete(uid);
        }
    }
    for (const [uid, pending] of pending2FASetups.entries()) {
        if (now > pending.expiresAt) {
            pending2FASetups.delete(uid);
        }
    }
    for (const [email, pending] of pendingPasswordResets.entries()) {
        if (now > pending.expiresAt) {
            pendingPasswordResets.delete(email);
        }
    }
}, 5 * 60 * 1000);
class AuthController {
    /**
     * Step 1: Validate registration info, generate 6-digit OTP code, and dispatch via email
     */
    static async sendSignupOtp(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const emailService = email_service_1.EmailService.getInstance();
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
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
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
        await db.logAudit('SIGNUP_OTP_DISPATCHED', `Signup verification code dispatched to ${cleanUsername} (${normalizedEmail}) via ${emailResult.deliveryMethod}`, req.ip || '127.0.0.1');
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
    static async verifySignupOtp(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
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
        await db.logAudit('USER_REGISTER_VERIFIED', `New real account verified & created: ${newUser.username} (${newUser.email})`, req.ip || '127.0.0.1', newUser.id, newUser.username);
        // Issue JWT session token (7-day validity)
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id, role: newUser.role, username: newUser.username }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            message: 'Account verified and created successfully!',
            token,
            user: (0, db_service_1.toSafeUser)(newUser),
        });
    }
    /**
     * Resend signup OTP code
     */
    static async resendSignupOtp(req, res) {
        const emailService = email_service_1.EmailService.getInstance();
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
    static async register(req, res) {
        const { otp } = req.body;
        if (otp && typeof otp === 'string' && otp.trim().length > 0) {
            await AuthController.verifySignupOtp(req, res);
        }
        else {
            await AuthController.sendSignupOtp(req, res);
        }
    }
    /**
     * Real user/password login
     */
    static async login(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { login, password, twoFactorCode } = req.body;
        const cleanLogin = (login || '').trim();
        const user = db.getUserByEmail(cleanLogin) ||
            db.getUserByUsername(cleanLogin);
        if (!user) {
            res.status(401).json({ success: false, error: 'Invalid email/username or password' });
            return;
        }
        if (user.status !== 'active') {
            res.status(403).json({ success: false, error: 'This account has been suspended by administration' });
            return;
        }
        // Account Lockout Protection (Anti-Credential Stuffing / Distributed Botnets)
        if (user.lockoutUntil && new Date(user.lockoutUntil).getTime() > Date.now()) {
            const remainingMinutes = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / 60000);
            res.status(429).json({
                success: false,
                error: `Account locked due to 5 consecutive failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;
            const updates = { failedLoginAttempts: failedAttempts };
            if (failedAttempts >= 5) {
                updates.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                await db.updateUser(user.id, updates);
                await db.logAudit('ACCOUNT_LOCKED', `Account ${user.username} locked out after 5 consecutive failed login attempts`, req.ip || '127.0.0.1', user.id, user.username);
                res.status(429).json({
                    success: false,
                    error: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
                });
                return;
            }
            await db.updateUser(user.id, updates);
            res.status(401).json({ success: false, error: 'Invalid email/username or password' });
            return;
        }
        // Reset failed login counter on successful password match
        if (user.failedLoginAttempts || user.lockoutUntil) {
            await db.updateUser(user.id, {
                failedLoginAttempts: 0,
                lockoutUntil: undefined,
            });
        }
        // Two-Factor Authentication (RFC 6238 TOTP) Enforcement
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            if (!twoFactorCode || typeof twoFactorCode !== 'string' || twoFactorCode.trim().length === 0) {
                res.status(200).json({
                    success: false,
                    requires2FA: true,
                    message: 'Two-factor authentication code required',
                });
                return;
            }
            const is2faValid = totp_service_1.TotpService.verifyToken(twoFactorCode.trim(), user.twoFactorSecret, 1);
            if (!is2faValid) {
                res.status(401).json({
                    success: false,
                    requires2FA: true,
                    error: 'Invalid 6-digit authenticator code. Please check your 2FA app.',
                });
                return;
            }
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            role: user.role,
            username: user.username,
            tokenVersion: user.tokenVersion || 1,
        }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        await db.logAudit(user.twoFactorEnabled ? 'USER_LOGIN_2FA' : 'USER_LOGIN', `User signed in ${user.twoFactorEnabled ? 'with 2FA verification' : ''}: ${user.username}`, req.ip || '127.0.0.1', user.id, user.username);
        res.json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: (0, db_service_1.toSafeUser)(user),
        });
    }
    static async getProfile(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        res.json({ success: true, user: (0, db_service_1.toSafeUser)(freshUser) });
    }
    static async regenerateApiKey(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const prefix = req.user.role === 'ADMIN' ? 'ds_adm_' : 'ds_usr_';
        const newApiKey = encryption_service_1.EncryptionService.generateApiKey(prefix);
        const nowIso = new Date().toISOString();
        await db.updateUser(req.user.id, {
            apiKey: newApiKey,
            apiKeyCreatedAt: nowIso,
        });
        await db.logAudit('API_KEY_ROTATED', `API key rotated for user: ${req.user.username}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.json({
            success: true,
            message: 'New API key generated successfully',
            apiKey: newApiKey,
            apiKeyCreatedAt: nowIso,
        });
    }
    /**
     * STEP 1: Request Email Change
     * Requires current password & new email.
     * Generates OTPs, dispatches first OTP to the OLD email.
     */
    static async requestEmailChange(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const emailService = email_service_1.EmailService.getInstance();
        const { currentPassword, newEmail } = req.body;
        if (!currentPassword || !newEmail) {
            res.status(400).json({ success: false, error: 'Current password and new email address are required' });
            return;
        }
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser) {
            res.status(404).json({ success: false, error: 'User account not found' });
            return;
        }
        // Verify current password
        const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, freshUser.passwordHash);
        if (!isPasswordValid) {
            res.status(400).json({ success: false, error: 'Current password does not match' });
            return;
        }
        const cleanNewEmail = newEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanNewEmail)) {
            res.status(400).json({ success: false, error: 'Please enter a valid email address format' });
            return;
        }
        if (cleanNewEmail === freshUser.email.toLowerCase()) {
            res.status(400).json({ success: false, error: 'New email cannot be the same as your current email' });
            return;
        }
        const existingUser = db.getUserByEmail(cleanNewEmail);
        if (existingUser && existingUser.id !== req.user.id) {
            res.status(409).json({ success: false, error: 'This email is already registered to another account' });
            return;
        }
        // Generate two separate 6-digit OTP codes: one for old email, one for new email
        const oldEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        pendingEmailChanges.set(freshUser.id, {
            userId: freshUser.id,
            currentEmail: freshUser.email,
            newEmail: cleanNewEmail,
            oldEmailOtp,
            newEmailOtp,
            oldEmailVerified: false,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });
        // Send code to the CURRENT (old) email address
        await emailService.sendSecurityOtp(freshUser.email, freshUser.username, oldEmailOtp, 'Email Change Request (Step 1/2)', `We received a request to update your account email to <strong>${cleanNewEmail}</strong>. Please enter the 6-digit code below to confirm authorization from your current email:`);
        res.json({
            success: true,
            step: 'VERIFY_OLD',
            currentEmail: freshUser.email,
            newEmail: cleanNewEmail,
            message: `Verification code sent to your current email (${freshUser.email}). Please enter it to continue.`,
        });
    }
    /**
     * STEP 2: Verify Code from Current (OLD) Email
     * Once confirmed, dispatches the second OTP to the NEW email.
     */
    static async verifyOldEmailChange(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const emailService = email_service_1.EmailService.getInstance();
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ success: false, error: 'Verification code is required' });
            return;
        }
        const pending = pendingEmailChanges.get(req.user.id);
        if (!pending) {
            res.status(400).json({ success: false, error: 'No pending email change request found. Please start over.' });
            return;
        }
        if (Date.now() > pending.expiresAt) {
            pendingEmailChanges.delete(req.user.id);
            res.status(400).json({ success: false, error: 'Verification code expired. Please request a new email change.' });
            return;
        }
        if (pending.oldEmailOtp !== code.trim()) {
            res.status(400).json({ success: false, error: 'Invalid verification code for your current email' });
            return;
        }
        // Mark current email as verified
        pending.oldEmailVerified = true;
        // Dispatch second code to the NEW email address
        await emailService.sendSecurityOtp(pending.newEmail, req.user.username, pending.newEmailOtp, 'Confirm Your New Email (Step 2/2)', `You are confirming <strong>${pending.newEmail}</strong> as your new email address for DigitalSMM. Enter this 6-digit code to complete the update:`);
        res.json({
            success: true,
            step: 'VERIFY_NEW',
            newEmail: pending.newEmail,
            message: `Current email verified! A verification code has now been sent to your new email (${pending.newEmail}).`,
        });
    }
    /**
     * STEP 3: Verify Code from NEW Email & Finalize Update
     */
    static async verifyNewEmailChange(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ success: false, error: 'Verification code is required' });
            return;
        }
        const pending = pendingEmailChanges.get(req.user.id);
        if (!pending || !pending.oldEmailVerified) {
            res.status(400).json({ success: false, error: 'Please verify authorization from your current email first' });
            return;
        }
        if (Date.now() > pending.expiresAt) {
            pendingEmailChanges.delete(req.user.id);
            res.status(400).json({ success: false, error: 'Verification session expired. Please start over.' });
            return;
        }
        if (pending.newEmailOtp !== code.trim()) {
            res.status(400).json({ success: false, error: 'Invalid verification code for your new email' });
            return;
        }
        // Double check email collision before finalizing
        const collision = db.getUserByEmail(pending.newEmail);
        if (collision && collision.id !== req.user.id) {
            res.status(409).json({ success: false, error: 'This email is already in use by another account' });
            return;
        }
        const updated = await db.updateUser(req.user.id, { email: pending.newEmail });
        pendingEmailChanges.delete(req.user.id);
        await db.logAudit('EMAIL_CHANGED', `User ${req.user.username} successfully updated email from ${pending.currentEmail} to ${pending.newEmail}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        const { passwordHash: _, ...safeUser } = updated || req.user;
        res.json({
            success: true,
            message: 'Email address successfully verified and updated!',
            user: safeUser,
        });
    }
    /**
     * Change User Password
     */
    static async changePassword(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
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
        const isMatch = await bcryptjs_1.default.compare(currentPassword, freshUser.passwordHash);
        if (!isMatch) {
            res.status(400).json({ success: false, error: 'Current password does not match' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const newHash = await bcryptjs_1.default.hash(newPassword, salt);
        const nextTokenVersion = (freshUser.tokenVersion || 1) + 1;
        // Security Hardening: Increment tokenVersion to immediately invalidate all other active JWT sessions
        await db.updateUser(req.user.id, {
            passwordHash: newHash,
            tokenVersion: nextTokenVersion,
            failedLoginAttempts: 0,
            lockoutUntil: undefined,
        });
        const newSessionToken = jsonwebtoken_1.default.sign({
            userId: freshUser.id,
            role: freshUser.role,
            username: freshUser.username,
            tokenVersion: nextTokenVersion,
        }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        await db.logAudit('PASSWORD_CHANGED', `Password changed & all prior sessions revoked for user: ${req.user.username} (TokenVersion: ${nextTokenVersion})`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.json({
            success: true,
            message: 'Password changed successfully. All previous sessions have been revoked.',
            token: newSessionToken,
        });
    }
    /**
     * Forgot Password - Step 1: Generate & dispatch 6-digit reset code via email
     */
    static async forgotPassword(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const emailService = email_service_1.EmailService.getInstance();
        const { email } = req.body;
        const query = (email || '').trim();
        if (!query) {
            res.status(400).json({ success: false, error: 'Email or username is required.' });
            return;
        }
        const normalized = query.toLowerCase();
        const user = db.getUserByEmail(normalized) || db.getUserByUsername(query);
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'No active account found with that email address or username.',
            });
            return;
        }
        const userEmail = user.email.toLowerCase().trim();
        // Rate-limit resend requests if recently dispatched (< 30 seconds)
        const existing = pendingPasswordResets.get(userEmail);
        if (existing && Date.now() - existing.lastSentAt < 30 * 1000) {
            const waitSec = Math.ceil((30 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
            res.status(429).json({
                success: false,
                error: `Please wait ${waitSec} seconds before requesting another reset code.`,
            });
            return;
        }
        // Generate cryptographically sound 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Store in pending password resets with 15-minute expiration
        pendingPasswordResets.set(userEmail, {
            userId: user.id,
            email: user.email,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000,
            attempts: 0,
            lastSentAt: Date.now(),
        });
        const emailResult = await emailService.sendPasswordResetOtp(user.email, user.username, otp);
        await db.logAudit('PASSWORD_RESET_OTP_DISPATCHED', `Password reset code dispatched to ${user.username} (${user.email}) via ${emailResult.deliveryMethod}`, req.ip || '127.0.0.1', user.id, user.username);
        res.json({
            success: true,
            message: `A 6-digit password reset code has been sent to ${user.email}.`,
            email: user.email,
            expiresInSeconds: 900,
            deliveryMethod: emailResult.deliveryMethod,
        });
    }
    /**
     * Forgot Password - Step 2: Verify reset OTP code and set new password
     */
    static async resetPassword(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { email, otp, newPassword } = req.body;
        const query = (email || '').trim();
        const cleanOtp = (otp || '').toString().trim();
        if (!query || !cleanOtp || !newPassword) {
            res.status(400).json({ success: false, error: 'Email, verification code, and new password are required.' });
            return;
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
            return;
        }
        // Find the pending reset record by checking either direct email or finding the user by username
        let targetEmail = query.toLowerCase();
        let pending = pendingPasswordResets.get(targetEmail);
        if (!pending) {
            const userByUname = db.getUserByUsername(query);
            if (userByUname) {
                targetEmail = userByUname.email.toLowerCase();
                pending = pendingPasswordResets.get(targetEmail);
            }
        }
        if (!pending) {
            res.status(400).json({
                success: false,
                error: 'No active password reset request found, or the code has expired. Please request a new code.',
            });
            return;
        }
        if (Date.now() > pending.expiresAt) {
            pendingPasswordResets.delete(targetEmail);
            res.status(400).json({
                success: false,
                error: 'The password reset code has expired. Please request a new code.',
            });
            return;
        }
        pending.attempts += 1;
        if (pending.attempts > 5) {
            pendingPasswordResets.delete(targetEmail);
            res.status(429).json({
                success: false,
                error: 'Too many incorrect verification attempts. Please request a new code.',
            });
            return;
        }
        if (pending.otp !== cleanOtp) {
            const attemptsLeft = 5 - pending.attempts;
            res.status(400).json({
                success: false,
                error: `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
            });
            return;
        }
        // OTP is valid! Retrieve target user
        const user = db.getUserById(pending.userId);
        if (!user) {
            pendingPasswordResets.delete(targetEmail);
            res.status(404).json({ success: false, error: 'User account could not be found.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const newHash = await bcryptjs_1.default.hash(newPassword, salt);
        const nextTokenVersion = (user.tokenVersion || 1) + 1;
        // Invalidate old sessions, update hash, reset lockouts
        const updatedUser = await db.updateUser(user.id, {
            passwordHash: newHash,
            tokenVersion: nextTokenVersion,
            failedLoginAttempts: 0,
            lockoutUntil: undefined,
        });
        // Remove pending reset record
        pendingPasswordResets.delete(targetEmail);
        const newSessionToken = jsonwebtoken_1.default.sign({
            userId: user.id,
            role: user.role,
            username: user.username,
            tokenVersion: nextTokenVersion,
        }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        await db.logAudit('PASSWORD_RESET_SUCCESS', `Password successfully reset for ${user.username} (${user.email}). All prior sessions revoked.`, req.ip || '127.0.0.1', user.id, user.username);
        const safeUser = updatedUser ? (0, db_service_1.toSafeUser)(updatedUser) : (0, db_service_1.toSafeUser)(user);
        res.json({
            success: true,
            message: 'Your password has been successfully reset. You can now log in.',
            token: newSessionToken,
            user: safeUser,
        });
    }
    /**
     * 2FA STEP 1: Generate Authenticator App Setup (Secret Key + QR Code)
     */
    static async setup2FA(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        // Generate random RFC 6238 Base32 secret (16 characters)
        const secret = totp_service_1.TotpService.generateSecret(16);
        const otpAuthUrl = totp_service_1.TotpService.getOtpAuthUrl(freshUser.username, secret);
        const qrCode = await totp_service_1.TotpService.generateQrCodeDataUrl(otpAuthUrl);
        // Save into pending 2FA setups
        pending2FASetups.set(freshUser.id, {
            userId: freshUser.id,
            secret,
            expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        res.json({
            success: true,
            secret,
            qrCode,
            otpAuthUrl,
            message: 'Scan the QR code or enter the key into your authenticator app, then enter the 6-digit code below.',
        });
    }
    /**
     * 2FA STEP 2: Verify TOTP Code & Officially Enable 2FA
     */
    static async verifyAndEnable2FA(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ success: false, error: '6-digit authenticator code is required' });
            return;
        }
        const pending = pending2FASetups.get(req.user.id);
        if (!pending) {
            res.status(400).json({ success: false, error: 'No pending 2FA setup found. Please click Enable again.' });
            return;
        }
        if (Date.now() > pending.expiresAt) {
            pending2FASetups.delete(req.user.id);
            res.status(400).json({ success: false, error: 'Setup session expired. Please click Enable to generate a new key.' });
            return;
        }
        // Verify TOTP code against the secret using RFC 6238 with +/- 30s tolerance
        const isValid = totp_service_1.TotpService.verifyToken(code.trim(), pending.secret, 1);
        if (!isValid) {
            res.status(400).json({ success: false, error: 'Invalid 6-digit code. Please check your authenticator app time and try again.' });
            return;
        }
        const updated = await db.updateUser(req.user.id, {
            twoFactorEnabled: true,
            twoFactorSecret: pending.secret,
        });
        pending2FASetups.delete(req.user.id);
        await db.logAudit('TWO_FACTOR_ENABLED', `Two-factor authentication enabled for user: ${req.user.username}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        const { passwordHash: _, ...safeUser } = updated || req.user;
        res.json({
            success: true,
            twoFactorEnabled: true,
            message: 'Two-factor authentication successfully enabled!',
            user: safeUser,
        });
    }
    /**
     * Disable Two-Factor Authentication
     */
    static async disable2FA(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { password, code } = req.body;
        const freshUser = db.getUserById(req.user.id);
        if (!freshUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        if (!freshUser.twoFactorEnabled) {
            res.status(400).json({ success: false, error: 'Two-factor authentication is not currently enabled' });
            return;
        }
        // Check authorization: either valid account password OR valid 2FA TOTP code
        let authorized = false;
        if (password && typeof password === 'string') {
            authorized = await bcryptjs_1.default.compare(password, freshUser.passwordHash);
        }
        else if (code && typeof code === 'string' && freshUser.twoFactorSecret) {
            authorized = totp_service_1.TotpService.verifyToken(code.trim(), freshUser.twoFactorSecret, 1);
        }
        if (!authorized) {
            res.status(400).json({ success: false, error: 'Please provide your account password or current 2FA code to disable' });
            return;
        }
        const updated = await db.updateUser(req.user.id, {
            twoFactorEnabled: false,
            twoFactorSecret: undefined,
        });
        await db.logAudit('TWO_FACTOR_DISABLED', `Two-factor authentication disabled for user: ${req.user.username}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        const { passwordHash: _, ...safeUser } = updated || req.user;
        res.json({
            success: true,
            twoFactorEnabled: false,
            message: 'Two-factor authentication has been disabled',
            user: safeUser,
        });
    }
    /**
     * Update User Timezone
     */
    static async updateTimezone(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const { timezone } = req.body;
        if (!timezone || typeof timezone !== 'string') {
            res.status(400).json({ success: false, error: 'Timezone is required' });
            return;
        }
        const updated = await db.updateUser(req.user.id, { timezone: timezone.trim() });
        await db.logAudit('TIMEZONE_UPDATED', `Timezone updated for ${req.user.username}: ${timezone}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
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
    static async googleAuth(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { credential, accessToken, twoFactorCode } = req.body;
        let targetEmail = null;
        let targetName = null;
        let targetPicture = null;
        // 1. Verify Google ID Token (Google Identity Services) cryptographically via Google's tokeninfo API
        if (credential && typeof credential === 'string') {
            try {
                const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`);
                if (verifyRes.ok) {
                    const payload = await verifyRes.json();
                    // Verify that email is present and verified by Google
                    if (payload.email && (payload.email_verified === 'true' || payload.email_verified === true)) {
                        targetEmail = payload.email;
                        targetName = payload.name || payload.given_name || payload.email.split('@')[0];
                        if (payload.picture && typeof payload.picture === 'string') {
                            targetPicture = payload.picture;
                        }
                    }
                }
            }
            catch (e) {
                console.error('Failed to verify Google ID token cryptographically:', e);
            }
        }
        // 2. Verify Google OAuth2 Access Token via Google UserInfo API
        if (!targetEmail && accessToken && typeof accessToken === 'string') {
            try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken.trim()}` },
                });
                if (userInfoRes.ok) {
                    const info = await userInfoRes.json();
                    if (info.email && info.email_verified !== false) {
                        targetEmail = info.email;
                        targetName = info.name || info.given_name || info.email.split('@')[0];
                        if (info.picture && typeof info.picture === 'string') {
                            targetPicture = info.picture;
                        }
                    }
                }
            }
            catch (e) {
                console.error('Failed to verify Google access token:', e);
            }
        }
        // Fallback: accept verified picture if passed from client OAuth callback
        if (!targetPicture && req.body.picture && typeof req.body.picture === 'string' && req.body.picture.startsWith('http')) {
            targetPicture = req.body.picture;
        }
        // Security check: NEVER accept unverified email strings from client body
        if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
            res.status(401).json({
                success: false,
                error: 'Cryptographic Google token verification failed. Unauthenticated sign-in rejected.',
            });
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
            const salt = await bcryptjs_1.default.genSalt(12);
            const passwordHash = await bcryptjs_1.default.hash(`google_${Date.now()}_${Math.random()}`, salt);
            user = await db.createUser({
                username: candidateUsername,
                email: targetEmail,
                passwordHash,
                balance: 0.0,
                role: 'USER',
                status: 'active',
                googlePicture: targetPicture || undefined,
                avatar: targetPicture || undefined,
            });
            await db.logAudit('GOOGLE_REGISTER', `User registered with Google: ${user.username} (${targetEmail})`, req.ip || '127.0.0.1', user.id, user.username);
        }
        else {
            if (user.status !== 'active') {
                res.status(403).json({ success: false, error: 'This account has been suspended by administration' });
                return;
            }
            // Update Google profile picture if new picture exists
            if (targetPicture && user.googlePicture !== targetPicture) {
                const updates = { googlePicture: targetPicture };
                if (!user.customAvatar) {
                    updates.avatar = targetPicture;
                }
                user = (await db.updateUser(user.id, updates)) || user;
            }
            // Enforce 2FA if enabled on this account
            if (user.twoFactorEnabled && user.twoFactorSecret) {
                if (!twoFactorCode || typeof twoFactorCode !== 'string' || twoFactorCode.trim().length === 0) {
                    res.status(200).json({
                        success: false,
                        requires2FA: true,
                        message: 'Two-factor authentication code required',
                    });
                    return;
                }
                const is2faValid = totp_service_1.TotpService.verifyToken(twoFactorCode.trim(), user.twoFactorSecret, 1);
                if (!is2faValid) {
                    res.status(401).json({
                        success: false,
                        requires2FA: true,
                        error: 'Invalid 6-digit authenticator code. Please check your 2FA app.',
                    });
                    return;
                }
            }
            await db.logAudit('GOOGLE_LOGIN', `User signed in with Google: ${user.username} (${targetEmail})`, req.ip || '127.0.0.1', user.id, user.username);
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            role: user.role,
            username: user.username,
            tokenVersion: user.tokenVersion || 1,
        }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: 'Signed in with Google successfully!',
            token,
            user: (0, db_service_1.toSafeUser)(user),
        });
    }
    /**
     * Upload or remove manual user profile avatar
     */
    static async updateAvatar(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const user = db.getUserById(req.user.id);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const { avatar, remove } = req.body;
        if (remove) {
            // Revert to Google picture if available, or undefined (falls back to First Character initial)
            const updatedUser = await db.updateUser(user.id, {
                customAvatar: undefined,
                avatar: user.googlePicture || undefined,
            });
            await db.logAudit('AVATAR_REMOVE', `User removed custom avatar: ${user.username}`, req.ip || '127.0.0.1', user.id, user.username);
            res.json({
                success: true,
                message: 'Profile photo removed. Default initial avatar restored.',
                user: updatedUser ? (0, db_service_1.toSafeUser)(updatedUser) : (0, db_service_1.toSafeUser)(user),
            });
            return;
        }
        if (!avatar || typeof avatar !== 'string') {
            res.status(400).json({ success: false, error: 'Please provide a valid image file.' });
            return;
        }
        // Limit maximum payload size for avatar (max 4MB base64)
        if (avatar.length > 5 * 1024 * 1024) {
            res.status(400).json({ success: false, error: 'Image file size is too large (max 4MB).' });
            return;
        }
        // Strict image format validation: must be base64 PNG, JPG, WebP, GIF, or secure HTTPS URL
        const isValidImage = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(avatar.trim()) ||
            /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*$/.test(avatar.trim());
        if (!isValidImage) {
            res.status(400).json({
                success: false,
                error: 'Invalid image format. Allowed formats: PNG, JPG, WebP, GIF.',
            });
            return;
        }
        const updatedUser = await db.updateUser(user.id, {
            customAvatar: avatar,
            avatar: avatar,
        });
        await db.logAudit('AVATAR_UPDATE', `User updated profile avatar: ${user.username}`, req.ip || '127.0.0.1', user.id, user.username);
        res.json({
            success: true,
            message: 'Profile picture updated successfully!',
            user: updatedUser ? (0, db_service_1.toSafeUser)(updatedUser) : (0, db_service_1.toSafeUser)(user),
        });
    }
}
exports.AuthController = AuthController;
