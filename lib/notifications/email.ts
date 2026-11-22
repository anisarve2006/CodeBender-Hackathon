import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { serverEnv } from '@/lib/env';

const resend = serverEnv.RESEND_API_KEY ? new Resend(serverEnv.RESEND_API_KEY) : null;

let smtpTransporter: Transporter | null = null;
if (!resend && serverEnv.SMTP_USER && serverEnv.SMTP_PASS) {
  const isGmail = !serverEnv.SMTP_HOST || serverEnv.SMTP_HOST.includes('gmail.com');
  if (isGmail) {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
      },
    });
  } else {
    smtpTransporter = nodemailer.createTransport({
      host: serverEnv.SMTP_HOST,
      port: Number(serverEnv.SMTP_PORT) || 587,
      secure: Boolean(serverEnv.SMTP_SECURE),
      auth: {
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
      },
    });
  }
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const fromAddress =
    serverEnv.SMTP_USER && !resend
      ? `Family Care Hub <${serverEnv.SMTP_USER}>`
      : serverEnv.EMAIL_FROM;

  // 1. Send via Resend if API key is provided
  if (resend) {
    try {
      await resend.emails.send({
        from: serverEnv.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      });
      return;
    } catch (err) {
      console.error('Failed to dispatch transactional email via Resend:', err);
    }
  }

  // 2. Send via Nodemailer SMTP if configured
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''),
      });
      return;
    } catch (err) {
      console.error('Failed to dispatch transactional email via Nodemailer SMTP:', err);
    }
  }

  // 3. Fallback: local development console simulator
  console.log('--- [DEV EMAIL SIMULATOR] ---');
  console.log(`From: ${fromAddress}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body (text): ${text || html.replace(/<[^>]*>?/gm, '')}`);
  console.log('-----------------------------');
}
