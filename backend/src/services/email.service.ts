import nodemailer from 'nodemailer';
import { DatabaseService } from './db.service';
import { ENV } from '../config/env';

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send a branded 6-digit email verification OTP to the user for signup
   */
  public async sendSignupOtp(
    email: string,
    username: string,
    otp: string
  ): Promise<{ success: boolean; deliveryMethod: 'smtp' | 'console'; error?: string }> {
    const db = DatabaseService.getInstance();

    const host = db.getSettingValue('smtp_host') || process.env.SMTP_HOST;
    const port = parseInt(db.getSettingValue('smtp_port') || process.env.SMTP_PORT || '587', 10);
    const user = db.getSettingValue('smtp_user') || process.env.SMTP_USER;
    const pass = db.getSettingValue('smtp_pass') || process.env.SMTP_PASS;
    const from =
      db.getSettingValue('smtp_from') ||
      process.env.SMTP_FROM ||
      `"DigitalSMM Support" <noreply@${host || 'digitalsmm.com'}>`;
    const secure = port === 465 || db.getSettingValue('smtp_secure') === 'true';

    console.log('\n===========================================================================');
    console.log('🔑 [DIGITALSMM SIGNUP OTP CODE]');
    console.log(`   To User:     ${username} <${email}>`);
    console.log(`   Verify Code: ${otp}`);
    console.log(`   Valid For:   10 minutes`);
    console.log('===========================================================================\n');

    if (host && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
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
      } catch (err: any) {
        console.error('❌ Failed to dispatch email via SMTP:', err.message);
        // Fallback to console delivery
        return { success: true, deliveryMethod: 'console', error: err.message };
      }
    }

    return { success: true, deliveryMethod: 'console' };
  }
}
