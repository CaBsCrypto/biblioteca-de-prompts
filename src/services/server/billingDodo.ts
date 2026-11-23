import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export type BillingOffer = 'monthly-card' | 'crypto-30-days';
export interface DodoConfig {
  apiKey: string;
  webhookKey: string;
  businessId: string;
  monthlyProductId: string;
  prepaidProductId: string;
  origin: string;
}

export class BillingError extends Error {
  constructor(readonly code: 'billing_unavailable' | 'invalid_request' | 'invalid_webhook' | 'access_required' | 'code_unavailable' | 'rate_limited', message: string) {
    super(message);
  }
}
export const unavailableBilling = () => new BillingError('billing_unavailable', 'Los pagos de prueba todavía no están disponibles.');
const providerId = z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/);

export function previewBillingOrigin(): string | undefined {
  const host = process.env.VERCEL_URL?.trim();
  if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'preview' || !host) return;
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i.test(host)) return;
  return 'https://' + host;
}

export function readBillingOrigin(): string | undefined {
  const value = process.env.BIBLIOTECA_BILLING_ORIGIN?.trim();
  return value === 'vercel-preview' ? previewBillingOrigin() : value;
}

export function readDodoConfig(): DodoConfig | undefined {
  if (process.env.BIBLIOTECA_BILLING_ENABLED !== 'true') return;
  if (process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview')) return;
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const businessId = process.env.BIBLIOTECA_DODO_BUSINESS_ID?.trim();
  const monthlyProductId = process.env.BIBLIOTECA_DODO_MONTHLY_PRODUCT_ID?.trim();
  const prepaidProductId = process.env.BIBLIOTECA_DODO_PREPAID_PRODUCT_ID?.trim();
  const origin = readBillingOrigin();
  // This implementation is deliberately sandbox-only. Live keys never reach a request.
  if (process.env.BIBLIOTECA_DODO_ENVIRONMENT !== 'test_mode' || !apiKey?.startsWith('dodo_test_')
    || !webhookKey || !origin || !providerId.safeParse(businessId).success
    || !providerId.safeParse(monthlyProductId).success || !providerId.safeParse(prepaidProductId).success
    || monthlyProductId === prepaidProductId) return;
  try {
    const url = new URL(origin);
    const local = process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return;
  } catch { return; }
  return { apiKey, webhookKey, businessId, monthlyProductId, prepaidProductId, origin };
}

export const dodoPaymentSchema = z.object({
  payment_id: providerId,
  business_id: providerId,
  status: z.string(),
  currency: z.string(),
  total_amount: z.number().int(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  metadata: z.record(z.string(), z.string()),
  customer: z.object({ customer_id: providerId }),
  product_cart: z.array(z.object({ product_id: providerId, quantity: z.number().int() })).nullable().optional(),
  subscription_id: providerId.nullable().optional(),
  payment_method_type: z.string().nullable().optional(),
  refunds: z.array(z.object({ status: z.string(), amount: z.number().int() })).default([]),
  disputes: z.array(z.object({ dispute_status: z.string() })).default([]),
  service_periods: z.array(z.object({
    subscription_id: providerId, starts_at: z.iso.datetime({ offset: true }), ends_at: z.iso.datetime({ offset: true }),
  })).default([]),
});
export type DodoPayment = z.infer<typeof dodoPaymentSchema>;

export const dodoSubscriptionSchema = z.object({
  subscription_id: providerId,
  product_id: providerId,
  customer: z.object({ customer_id: providerId }),
  metadata: z.record(z.string(), z.string()),
  status: z.string(),
  currency: z.string(),
  quantity: z.number().int(),
  recurring_pre_tax_amount: z.number().int(),
  payment_frequency_count: z.number().int(),
  payment_frequency_interval: z.string(),
  next_billing_date: z.iso.datetime({ offset: true }),
  previous_billing_date: z.iso.datetime({ offset: true }),
  cancel_at_next_billing_date: z.boolean(),
});
export type DodoSubscription = z.infer<typeof dodoSubscriptionSchema>;

export interface DodoClient {
  validateProduct(offer: BillingOffer): Promise<void>;
  createCheckout(input: { offer: BillingOffer; attemptId: string; email: string; name: string; customerId?: string }): Promise<{ sessionId: string; checkoutUrl: string }>;
  getPayment(id: string): Promise<DodoPayment>;
  getSubscription(id: string): Promise<DodoSubscription>;
  createPortal(customerId: string): Promise<string>;
}

export function safeDodoCheckout(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || !['test.checkout.dodopayments.com', 'test.dodopayments.com'].includes(url.hostname)) throw unavailableBilling();
  return url.href;
}

/** Dodo's Standard Webhooks signature covers the unmodified body, id and timestamp. */
export function verifyDodoWebhook(raw: Buffer, headers: { id?: string; timestamp?: string; signature?: string }, secret: string, now = Date.now()) {
  const { id, timestamp, signature } = headers;
  if (!id || id.length > 200 || !/^[A-Za-z0-9_-]+$/.test(id) || !timestamp || !/^\d{10}$/.test(timestamp)
    || Math.abs(now / 1000 - Number(timestamp)) > 300 || !signature || signature.length > 4096) {
    throw new BillingError('invalid_webhook', 'El webhook no tiene una firma vigente.');
  }
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  if (key.length < 16) throw unavailableBilling();
  const expected = createHmac('sha256', key).update(id + '.' + timestamp + '.').update(raw).digest();
  const valid = signature.split(' ').some(item => {
    const [version, encoded] = item.split(',');
    if (version !== 'v1' || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
    const actual = Buffer.from(encoded, 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!valid) throw new BillingError('invalid_webhook', 'El webhook no tiene una firma válida.');
  return id;
}

export function createDodoClient(config: DodoConfig, transport: typeof fetch = fetch): DodoClient {
  async function request(path: string, method = 'GET', body?: object, idempotencyKey?: string): Promise<unknown> {
    const response = await transport('https://test.dodopayments.com' + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(12_000),
      headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw unavailableBilling();
    return response.json();
  }
  const productId = (offer: BillingOffer) => offer === 'monthly-card' ? config.monthlyProductId : config.prepaidProductId;
  return {
    async validateProduct(offer) {
      const product = z.object({
        product_id: providerId, is_recurring: z.boolean().optional(),
        price: z.object({ type: z.string(), currency: z.string(), price: z.number().int(),
          payment_frequency_count: z.number().optional(), payment_frequency_interval: z.string().optional(),
          trial_period_days: z.number().optional(), pay_what_you_want: z.boolean().optional() }),
      }).parse(await request('/products/' + encodeURIComponent(productId(offer))));
      if (product.product_id !== productId(offer) || product.price.price !== 299 || product.price.currency !== 'USD'
        || product.price.pay_what_you_want || (product.price.trial_period_days ?? 0) !== 0
        || (offer === 'monthly-card' ? product.price.type !== 'recurring_price'
          || product.price.payment_frequency_count !== 1 || product.price.payment_frequency_interval !== 'Month'
          : product.price.type !== 'one_time_price')) throw unavailableBilling();
    },
    async createCheckout(input) {
      const response = z.object({ session_id: providerId, checkout_url: z.string() }).parse(await request('/checkouts', 'POST', {
        product_cart: [{ product_id: productId(input.offer), quantity: 1 }],
        customer: input.customerId ? { customer_id: input.customerId } : { email: input.email, name: input.name },
        allowed_payment_method_types: input.offer === 'monthly-card' ? ['credit', 'debit'] : ['crypto_currency', 'credit', 'debit'],
        billing_currency: 'USD',
        metadata: { biblioteca_checkout_id: input.attemptId },
        return_url: config.origin + '/planes?checkout=returned',
        ...(input.offer === 'monthly-card' ? { subscription_data: { trial_period_days: 0 } } : {}),
      }, 'biblioteca-' + input.attemptId));
      return { sessionId: response.session_id, checkoutUrl: safeDodoCheckout(response.checkout_url) };
    },
    async getPayment(id) {
      return dodoPaymentSchema.parse(await request('/payments/' + encodeURIComponent(id)));
    },
    async getSubscription(id) {
      return dodoSubscriptionSchema.parse(await request('/subscriptions/' + encodeURIComponent(id)));
    },
    async createPortal(customerId) {
      const result = z.object({ link: z.string() }).parse(await request('/customers/' + encodeURIComponent(customerId) + '/customer-portal/session', 'POST'));
      return safeDodoCheckout(result.link);
    },
  };
}
