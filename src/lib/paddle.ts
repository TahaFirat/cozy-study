import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { SubscriptionPlan } from '../store/useSubscriptionStore';

export interface PaddleCheckoutOptions {
  plan: SubscriptionPlan;
  userId: string;
  userEmail: string;
  userName?: string;
  discountCode?: string;
  onSuccess: (data: { transactionId: string; plan: SubscriptionPlan }) => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

// Environment variables
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';
const PADDLE_ENV = (import.meta.env.VITE_PADDLE_ENV || 'sandbox') as 'sandbox' | 'production';

// Plan to Price ID mapping (Paddle Dashboard'da oluşturulan Price ID'ler)
export const PADDLE_PRICE_IDS: Record<SubscriptionPlan, string> = {
  free: '',
  monthly: import.meta.env.VITE_PADDLE_PRICE_MONTHLY || 'pri_01jm_monthly_cozy',
  yearly: import.meta.env.VITE_PADDLE_PRICE_YEARLY || 'pri_01jm_yearly_cozy',
  lifetime: import.meta.env.VITE_PADDLE_PRICE_LIFETIME || 'pri_01jm_lifetime_cozy',
};

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | null> | null = null;

export function isPaddleConfigured(): boolean {
  return Boolean(PADDLE_CLIENT_TOKEN && PADDLE_CLIENT_TOKEN.trim().length > 0);
}

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  if (!isPaddleConfigured()) return null;

  if (!initPromise) {
    initPromise = initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event.name === 'checkout.error') {
          console.error('[Paddle Checkout Error]', event.data);
        }
      },
    }).then((p) => {
      paddleInstance = p || null;
      return paddleInstance;
    }).catch((err) => {
      console.error('[Paddle Init Failed]', err);
      initPromise = null;
      return null;
    });
  }

  return initPromise;
}

/**
 * Paddle Checkout Overlay açar (3D Secure, Türkiye ve Uluslararası kartlar, Apple Pay vb.)
 */
export async function openPaddleCheckout(options: PaddleCheckoutOptions): Promise<boolean> {
  const { plan, userId, userEmail, discountCode, onSuccess, onError } = options;

  if (plan === 'free') {
    onSuccess({ transactionId: `free-${Date.now()}`, plan: 'free' });
    return true;
  }

  const paddle = await getPaddle();

  // Paddle yapılandırılmamışsa veya token yoksa
  if (!paddle) {
    console.info('[Paddle] Gerçek istemci tokeni ayarlanmamış, fallback modunda çalışılacak.');
    return false;
  }

  const priceId = PADDLE_PRICE_IDS[plan];

  try {
    const checkoutOptions: any = {
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'tr',
        allowLogout: false,
        successUrl: `${window.location.origin}/?payment=success&plan=${plan}`,
      },
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId,
        plan,
      },
    };

    if (userEmail && userEmail.trim().length > 0) {
      checkoutOptions.customer = { email: userEmail.trim() };
    }
    if (discountCode && discountCode.trim().length > 0) {
      checkoutOptions.discountCode = discountCode.trim();
    }

    paddle.Checkout.open(checkoutOptions);
    return true;
  } catch (err: any) {
    console.error('[Paddle Open Error]', err);
    if (onError) onError(err?.message || 'Paddle checkout açılamadı');
    return false;
  }
}
