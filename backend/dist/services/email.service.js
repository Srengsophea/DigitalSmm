"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_service_1 = require("./db.service");
class EmailService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }
    getSmtpConfig() {
        // Dynamically reload .env to catch any newly saved credentials without server restart
        dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env'), override: true });
        const db = db_service_1.DatabaseService.getInstance();
        const host = db.getSettingValue('smtp_host') || process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = parseInt(db.getSettingValue('smtp_port') || process.env.SMTP_PORT || '465', 10);
        const user = (db.getSettingValue('smtp_user') || process.env.SMTP_USER || '').trim();
        // Auto-strip spaces in case user pastes 16-character Google App Password with spaces
        const pass = (db.getSettingValue('smtp_pass') || process.env.SMTP_PASS || '').replace(/\s+/g, '');
        const from = db.getSettingValue('smtp_from') ||
            process.env.SMTP_FROM ||
            `"DigitalSMM Security" <${user || 'noreply@digitalsmm.com'}>`;
        const secure = port === 465 || db.getSettingValue('smtp_secure') === 'true' || process.env.SMTP_SECURE === 'true';
        return { host, port, user, pass, from, secure };
    }
    /**
     * Send a branded 6-digit email verification OTP to the user for signup
     */
    async sendSignupOtp(email, username, otp) {
        const { host, port, user, pass, from, secure } = this.getSmtpConfig();
        console.log('\n===========================================================================');
        console.log('🔑 [DIGITALSMM SIGNUP OTP CODE]');
        console.log(`   To User:     ${username} <${email}>`);
        console.log(`   Verify Code: ${otp}`);
        console.log(`   Valid For:   10 minutes`);
        console.log(`   SMTP Sender: ${user || '(none - console mode)'}`);
        console.log('===========================================================================\n');
        if (host && user && pass) {
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host,
                    port,
                    secure,
                    auth: {
                        user,
                        pass,
                    },
                    tls: {
                        rejectUnauthorized: false, // Prevents self-signed cert blocks
                    },
                });
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DigitalSMM Email Verification</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1021; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .container { max-width: 540px; margin: 40px auto; background: #131b34; border: 1px solid #1e294b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .header { background: linear-gradient(135deg, #162399 0%, #0284c7 100%); padding: 32px 24px; text-align: center; }
    .logo-text { font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; margin: 0; }
    .body-content { padding: 36px 32px; text-align: center; }
    .greeting { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .desc { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px; }
    .code-box { background: #0b1126; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 28px; }
    .code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; margin-left: 10px; }
    .expiry { font-size: 13px; color: #f59e0b; font-weight: 600; margin-bottom: 24px; }
    .footer { background: #0a0e1c; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #17203d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">⚡ DIGITALSMM</div>
      <div style="color: #e0f2fe; font-size: 13px; margin-top: 4px;">Direct Autonomous SMM Platform</div>
    </div>
    <div class="body-content">
      <div class="greeting">Welcome to DigitalSMM, ${username}!</div>
      <div class="desc">Please use the 6-digit verification code below to confirm your email and complete your account creation.</div>
      
      <div class="code-box">
        <div class="code">${otp}</div>
      </div>
      
      <div class="expiry">⚠️ This code expires in 10 minutes.</div>
      <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
        If you did not request this account registration, please safely ignore this email.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} DigitalSMM. All rights reserved. Automated Security Verification.
    </div>
  </div>
</body>
</html>
        `;
                await transporter.sendMail({
                    from,
                    to: email,
                    subject: `${otp} is your DigitalSMM verification code`,
                    text: `Welcome ${username}! Your DigitalSMM verification code is: ${otp}. It expires in 10 minutes.`,
                    html,
                });
                console.log(`✅ Verification email dispatched via SMTP to ${email}`);
                return { success: true, deliveryMethod: 'smtp' };
            }
            catch (err) {
                console.error('❌ Failed to dispatch email via SMTP:', err.message);
                // Fallback to console delivery
                return { success: true, deliveryMethod: 'console', error: err.message };
            }
        }
        return { success: true, deliveryMethod: 'console' };
    }
    /**
     * Send a branded 6-digit email password reset OTP code
     */
    async sendPasswordResetOtp(email, username, otp) {
        const { host, port, user, pass, from, secure } = this.getSmtpConfig();
        console.log('\n===========================================================================');
        console.log('🔐 [DIGITALSMM PASSWORD RESET OTP CODE]');
        console.log(`   To User:     ${username} <${email}>`);
        console.log(`   Reset Code:  ${otp}`);
        console.log(`   Valid For:   15 minutes`);
        console.log(`   SMTP Sender: ${user || '(none - console mode)'}`);
        console.log('===========================================================================\n');
        if (host && user && pass) {
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host,
                    port,
                    secure,
                    auth: {
                        user,
                        pass,
                    },
                    tls: {
                        rejectUnauthorized: false,
                    },
                });
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your DigitalSMM Password</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1021; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .container { max-width: 540px; margin: 40px auto; background: #131b34; border: 1px solid #1e294b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .header { background: linear-gradient(135deg, #e11d48 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
    .logo-text { font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; margin: 0; }
    .body-content { padding: 36px 32px; text-align: center; }
    .greeting { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .desc { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px; }
    .code-box { background: #0b1126; border: 2px dashed #f43f5e; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 28px; }
    .code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #fb7185; font-family: 'Courier New', Courier, monospace; margin-left: 10px; }
    .expiry { font-size: 13px; color: #f59e0b; font-weight: 600; margin-bottom: 24px; }
    .footer { background: #0a0e1c; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #17203d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">⚡ DIGITALSMM</div>
      <div style="color: #ffe4e6; font-size: 13px; margin-top: 4px;">Password Recovery Verification</div>
    </div>
    <div class="body-content">
      <div class="greeting">Reset Password for ${username}</div>
      <div class="desc">We received a request to reset the password for your DigitalSMM account. Use the 6-digit verification code below to authorize your password reset:</div>
      
      <div class="code-box">
        <div class="code">${otp}</div>
      </div>
      
      <div class="expiry">⏱️ This code expires in 15 minutes.</div>
      <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
        If you did not request a password reset, please disregard this email. Your current password remains completely unchanged and secure.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} DigitalSMM Security. Automated Password Recovery Service.
    </div>
  </div>
</body>
</html>
        `;
                await transporter.sendMail({
                    from,
                    to: email,
                    subject: `${otp} is your DigitalSMM password reset code`,
                    text: `Hello ${username}! Your password reset code is: ${otp}. It expires in 15 minutes. If you did not request this, please ignore this email.`,
                    html,
                });
                console.log(`✅ Password reset email dispatched via SMTP to ${email}`);
                return { success: true, deliveryMethod: 'smtp' };
            }
            catch (err) {
                console.error('❌ Failed to dispatch password reset email via SMTP:', err.message);
                return { success: true, deliveryMethod: 'console', error: err.message };
            }
        }
        return { success: true, deliveryMethod: 'console' };
    }
    /**
     * Send a branded security verification code for account settings (change email, etc.)
     */
    async sendSecurityOtp(email, username, otp, title, actionDescription) {
        const { host, port, user, pass, from, secure } = this.getSmtpConfig();
        console.log('\n===========================================================================');
        console.log(`🔒 [DIGITALSMM SECURITY CODE: ${title.toUpperCase()}]`);
        console.log(`   To User:     ${username} <${email}>`);
        console.log(`   Action:      ${actionDescription}`);
        console.log(`   Verify Code: ${otp}`);
        console.log(`   Valid For:   10 minutes`);
        console.log(`   SMTP Sender: ${user || '(none - console mode)'}`);
        console.log('===========================================================================\n');
        if (host && user && pass) {
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host,
                    port,
                    secure,
                    auth: { user, pass },
                    tls: { rejectUnauthorized: false },
                });
                const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="540" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #162399; padding: 24px; text-align: center;">
              <span style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 0.5px;">DIGITALSMM</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 8px; font-size: 20px;">${title}</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                Hello <strong>${username}</strong>,<br>
                ${actionDescription}
              </p>
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #162399;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
                ⏱️ This verification code is valid for <strong>10 minutes</strong>. If you did not request this change, please change your password immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
                await transporter.sendMail({
                    from,
                    to: email,
                    subject: `DigitalSMM Security Code: ${otp}`,
                    text: `${title}: Your code is ${otp}. Valid for 10 minutes.`,
                    html,
                });
                console.log(`✅ Security email dispatched via SMTP to ${email}`);
                return { success: true, deliveryMethod: 'smtp' };
            }
            catch (err) {
                console.error('❌ Failed to dispatch security email via SMTP:', err.message);
                return { success: true, deliveryMethod: 'console', error: err.message };
            }
        }
        return { success: true, deliveryMethod: 'console' };
    }
}
exports.EmailService = EmailService;
