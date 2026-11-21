import crypto from 'node:crypto';
import webpush from 'web-push';

function generateSecrets() {
  const authEncryptionKey = crypto.randomBytes(32).toString('base64');
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('--- Generated Secrets for .env.local ---');
  console.log(`AUTH_ENCRYPTION_KEY="${authEncryptionKey}"`);
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
  console.log('---------------------------------------');
}

generateSecrets();
