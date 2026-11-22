import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { serverEnv } from '@/lib/env';

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
};

let cachedTransporter: Transporter | null = null;

/**
 * Returns a configured Nodemailer Transporter instance.
 * Supports Gmail SMTP with App Passwords, custom SMTP servers, or a JSON mock transport.
 */
export function getEmailTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. If SMTP credentials are provided, use standard SMTP or Gmail service
  if (serverEnv.SMTP_USER && serverEnv.SMTP_PASS) {
    const isGmail =
      !serverEnv.SMTP_HOST ||
      serverEnv.SMTP_HOST.toLowerCase().includes('gmail.com');

    if (isGmail) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: serverEnv.SMTP_USER,
          pass: serverEnv.SMTP_PASS,
        },
      });
    } else {
      cachedTransporter = nodemailer.createTransport({
        host: serverEnv.SMTP_HOST,
        port: Number(serverEnv.SMTP_PORT) || 587,
        secure: Boolean(serverEnv.SMTP_SECURE),
        auth: {
          user: serverEnv.SMTP_USER,
          pass: serverEnv.SMTP_PASS,
        },
      });
    }
    return cachedTransporter;
  }

  // 2. Fallback: local development / test transport
  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  return cachedTransporter;
}

/**
 * Dispatches a transactional email using Nodemailer.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailOptions): Promise<void> {
  const fromAddress = serverEnv.SMTP_USER
    ? `Family Care Hub <${serverEnv.SMTP_USER}>`
    : serverEnv.EMAIL_FROM;

  const plainText = text || html.replace(/<[^>]*>?/gm, '');

  if (serverEnv.SMTP_USER && serverEnv.SMTP_PASS) {
    try {
      const transporter = getEmailTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: plainText,
        attachments,
      });
      console.log(`[Email Sent via Nodemailer] ID: ${info.messageId} to ${to}`);
      return;
    } catch (err) {
      console.error('Failed to dispatch transactional email via Nodemailer:', err);
      throw err;
    }
  }

  // Fallback: development simulation
  console.log('--- [DEV EMAIL SIMULATOR (NodeMailer)] ---');
  console.log(`From: ${fromAddress}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body (text): ${plainText}`);
  console.log('-----------------------------------------');
}
