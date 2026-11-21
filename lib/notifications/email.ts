import { Resend } from 'resend';
import { serverEnv } from '@/lib/env';

const resend = serverEnv.RESEND_API_KEY ? new Resend(serverEnv.RESEND_API_KEY) : null;

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  if (!resend) {
    console.log('--- [DEV EMAIL SIMULATOR] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (text): ${text || html.replace(/<[^>]*>?/gm, '')}`);
    console.log('-----------------------------');
    return;
  }

  try {
    await resend.emails.send({
      from: serverEnv.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('Failed to dispatch transactional email via Resend:', err);
  }
}
