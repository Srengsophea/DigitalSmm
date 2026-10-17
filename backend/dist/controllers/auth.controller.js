"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_service_1 = require("../services/db.service");
const env_1 = require("../config/env");
const encryption_service_1 = require("../services/encryption.service");
class AuthController {
    static async register(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { username, email, password } = req.body;
        // Check if email already registered
        if (db.getUserByEmail(email)) {
            res.status(409).json({ success: false, error: 'Email is already registered' });
            return;
        }
        // Check if username already taken
        if (db.getUserByUsername(username)) {
            res.status(409).json({ success: false, error: 'Username is already taken' });
            return;
        }
        // Hash password with bcrypt salt rounds = 12
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await db.createUser({
            username,
            email: email.toLowerCase(),
            passwordHash,
            balance: 0.0,
            role: 'USER',
            status: 'active',
        });
        await db.logAudit('USER_REGISTER', `New user registered: ${username} (${email})`, req.ip || '127.0.0.1', newUser.id, username);
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id, role: newUser.role, username: newUser.username }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        const { passwordHash: _, ...safeUser } = newUser;
        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: safeUser,
        });
    }
    static async login(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { login, password } = req.body;
        const user = db.getUserByEmail(login) ||
            db.getUserByUsername(login);
        if (!user) {
            res.status(401).json({ success: false, error: 'Invalid email/username or password' });
            return;
        }
        if (user.status !== 'active') {
            res.status(403).json({ success: false, error: 'This account has been suspended' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ success: false, error: 'Invalid email/username or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, username: user.username }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        await db.logAudit('USER_LOGIN', `User signed in: ${user.username}`, req.ip || '127.0.0.1', user.id, user.username);
        const { passwordHash: _, ...safeUser } = user;
        res.json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: safeUser,
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
        const { passwordHash: _, ...safeUser } = freshUser;
        res.json({ success: true, user: safeUser });
    }
    static async regenerateApiKey(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const db = db_service_1.DatabaseService.getInstance();
        const prefix = req.user.role === 'ADMIN' ? 'ds_adm_' : 'ds_usr_';
        const newApiKey = encryption_service_1.EncryptionService.generateApiKey(prefix);
        await db.updateUser(req.user.id, { apiKey: newApiKey });
        await db.logAudit('API_KEY_ROTATED', `API key rotated for user: ${req.user.username}`, req.ip || '127.0.0.1', req.user.id, req.user.username);
        res.json({
            success: true,
            message: 'New API key generated successfully',
            apiKey: newApiKey,
        });
    }
    static async googleAuth(req, res) {
        const db = db_service_1.DatabaseService.getInstance();
        const { email, name, credential } = req.body;
        let targetEmail = email;
        let targetName = name;
        // Decode Google ID Token if present
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
            }
            catch (e) {
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
            // Create new user from Google Account
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
            });
            await db.logAudit('GOOGLE_REGISTER', `User registered with Google: ${user.username} (${targetEmail})`, req.ip || '127.0.0.1', user.id, user.username);
        }
        else {
            if (user.status !== 'active') {
                res.status(403).json({ success: false, error: 'Account suspended' });
                return;
            }
            await db.logAudit('GOOGLE_LOGIN', `User signed in with Google: ${user.username} (${targetEmail})`, req.ip || '127.0.0.1', user.id, user.username);
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, username: user.username }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
        const { passwordHash: _, ...safeUser } = user;
        res.json({
            success: true,
            message: 'Signed in with Google / Gmail successfully!',
            token,
            user: safeUser,
        });
    }
}
exports.AuthController = AuthController;
