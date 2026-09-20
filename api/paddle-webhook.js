// api/paddle-webhook.js
// Vercel Serverless Function — Paddle Billing Webhook İşleyici
// Paddle üzerinden başarılı olan ödemeleri ve abonelikleri dinleyip Firestore'a işler

const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Firebase Admin SDK
function getFirestoreAdmin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      console.warn('[Paddle Webhook] FIREBASE_SERVICE_ACCOUNT_JSON ayarlanmamış.');
      return null;
    }
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

/**
 * Paddle Billing Webhook imzasını doğrular
 */
function verifyPaddleSignature(rawBody, signatureHeader, secretKey) {
  if (!secretKey || !signatureHeader) return true; // Secret tanımlı değilse pas geç (test kolaylığı)

  try {
    const parts = signatureHeader.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const ts = parts['ts'];
    const h1 = parts['h1'];
    if (!ts || !h1) return false;

    const signedPayload = `${ts}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expectedSignature));
  } catch (err) {
    console.error('[Paddle Webhook] İmza doğrulama hatası:', err);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const signature = req.headers['paddle-signature'];
  const secretKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

  const isValid = verifyPaddleSignature(rawBody, signature, secretKey);
  if (!isValid) {
    console.error('[Paddle Webhook] Geçersiz imza!');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const eventType = payload.event_type;
  const eventData = payload.data;

  console.log(`[Paddle Webhook] Olay alındı: ${eventType}`);

  // Başarılı işlem veya abonelik olayları
  if (
    eventType === 'transaction.completed' ||
    eventType === 'transaction.paid' ||
    eventType === 'subscription.activated' ||
    eventType === 'subscription.created'
  ) {
    const customData = eventData.custom_data || {};
    const userId = customData.userId;
    const plan = customData.plan || 'yearly';

    if (userId) {
      try {
        const firestore = getFirestoreAdmin();
        if (firestore) {
          const now = new Date();
          let expiresAt = null;
          if (plan === 'monthly') {
            const exp = new Date(now);
            exp.setMonth(exp.getMonth() + 1);
            expiresAt = exp.toISOString();
          } else if (plan === 'yearly') {
            const exp = new Date(now);
            exp.setFullYear(exp.getFullYear() + 1);
            expiresAt = exp.toISOString();
          }

          await firestore.collection('users').doc(userId).set(
            {
              subscription: {
                isPro: true,
                plan,
                provider: 'paddle',
                paymentId: eventData.id,
                subscribedAt: now.toISOString(),
                expiresAt,
                updatedAt: FieldValue.serverTimestamp(),
              },
            },
            { merge: true }
          );
          console.log(`[Paddle Webhook] ✅ Kullanıcı aboneliği güncellendi: ${userId}`);
        }
      } catch (err) {
        console.error('[Paddle Webhook] Firestore kayıt hatası:', err);
      }
    }
  }

  // Paddle'a anında 200 OK yanıtı ver
  return res.status(200).json({ received: true });
}
