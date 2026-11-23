import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Auth } from 'firebase-admin/auth';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBillingCheckout, processBillingWebhook } from '../src/services/server/billing';
import { issueBillingCode, listBillingCodes, redeemBillingCode, revokeBillingCode } from '../src/services/server/billingCodes';
import { installBillingHttp, installBillingWebhook } from '../src/services/server/billingHttp';
import { createDodoClient, previewBillingOrigin, readDodoConfig, verifyDodoWebhook, type DodoClient, type DodoConfig, type DodoPayment, type DodoSubscription } from '../src/services/server/billingDodo';
import { ensurePilotEntry, readLibraryAccess } from '../src/services/server/libraryAccess';

// A transaction buffers its writes and rejects reads after writes, like Firestore.
// Concurrent calls serialize so tests can check single-use and duplicate delivery.
function memoryFirestore() {
  const rows = new Map<string, Record<string, any>>();
  let tail = Promise.resolve();
  function snapshot(path: string) {
    const data = rows.get(path);
    return { id: path.split('/').at(-1), exists: Boolean(data), get: (key: string) => data?.[key], data: () => data ? { ...data } : undefined };
  }
  function reference(path: string): any {
    return { path, id: path.split('/').at(-1), collection: (name: string) => collection(path + '/' + name),
      get: async () => snapshot(path),
      set: async (data: object, options?: { merge?: boolean }) => { rows.set(path, { ...(options?.merge ? rows.get(path) : {}), ...data }); },
      create: async (data: object) => {
        if (rows.has(path)) throw new Error('already-exists');
        rows.set(path, { ...data });
      },
    };
  }
  function collection(path: string, conditions: Array<[string, string, unknown]> = [], order?: string, maximum = Infinity): any {
    const query = { path, conditions, order, maximum,
      doc: (id: string) => reference(path + '/' + id),
      where: (key: string, operator: string, value: unknown) => collection(path, [...conditions, [key, operator, value]], order, maximum),
      orderBy: (key: string) => collection(path, conditions, key, maximum),
      limit: (count: number) => collection(path, conditions, order, count),
      get: async () => querySnapshot(path, conditions, order, maximum),
    };
    return query;
  }
  const compare = (value: any) => value?.toMillis?.() ?? value;
  function querySnapshot(path: string, conditions: Array<[string, string, unknown]>, order?: string, maximum = Infinity) {
    const docs = [...rows.keys()].filter(key => key.startsWith(path + '/') && key.slice(path.length + 1).indexOf('/') < 0)
      .filter(key => conditions.every(([field, operator, value]) => operator === '>' ? compare(rows.get(key)?.[field]) > compare(value) : rows.get(key)?.[field] === value))
      .sort((a, b) => order ? compare(rows.get(b)?.[order]) - compare(rows.get(a)?.[order]) : 0)
      .slice(0, maximum).map(snapshot);
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
  const db = { collection, async runTransaction(work: (tx: any) => Promise<any>) {
    let release!: () => void;
    const wait = tail;
    tail = new Promise<void>(resolve => { release = resolve; });
    await wait;
    let wrote = false;
    const writes: Array<() => void> = [];
    const tx = {
      get: async (ref: any) => {
        if (wrote) throw new Error('read-after-write');
        return ref.conditions ? querySnapshot(ref.path, ref.conditions, ref.order, ref.maximum) : snapshot(ref.path);
      },
      getAll: async (...refs: any[]) => {
        if (wrote) throw new Error('read-after-write');
        return refs.map(ref => snapshot(ref.path));
      },
      create: (ref: any, data: object) => {
        wrote = true; writes.push(() => {
          if (rows.has(ref.path)) throw new Error('already-exists');
          rows.set(ref.path, { ...data });
        });
      },
      set: (ref: any, data: object, options?: { merge?: boolean }) => {
        wrote = true; writes.push(() => rows.set(ref.path, { ...(options?.merge ? rows.get(ref.path) : {}), ...data }));
      },
      update: (ref: any, data: object) => {
        wrote = true; writes.push(() => rows.set(ref.path, { ...rows.get(ref.path), ...data }));
      },
    };
    try {
      const result = await work(tx);
      for (const write of writes) write();
      return result;
    } finally { release(); }
  } };
  return { db: db as unknown as Firestore, rows };
}

const NOW = Date.parse('2026-11-22T12:00:00Z');
const DAY = 86_400_000;
const hash = (value: string) => createHash('sha256').update(value).digest('base64url');
const config: DodoConfig = {
  apiKey: 'dodo_test_synthetic.key', webhookKey: 'whsec_' + Buffer.alloc(32, 7).toString('base64'),
  businessId: 'bus_test', monthlyProductId: 'pdt_monthly', prepaidProductId: 'pdt_prepaid', origin: 'http://localhost:3000',
};
const iso = (millis: number) => new Date(millis).toISOString();
const timestamp = (millis: number) => Timestamp.fromMillis(millis);
function invite(rows: Map<string, Record<string, any>>, uid: string) {
  rows.set('_bibliotecaEntitlements/' + uid, { chatgptPersonalLibrary: true, expiresAt: timestamp(NOW + DAY) });
}
function provider(payment: DodoPayment, subscription?: DodoSubscription): DodoClient {
  return {
    validateProduct: vi.fn(async () => {}),
    createCheckout: vi.fn(async () => ({ sessionId: 'cks_test', checkoutUrl: 'https://test.checkout.dodopayments.com/buy/test' })),
    getPayment: vi.fn(async () => payment),
    getSubscription: vi.fn(async () => subscription!),
    createPortal: vi.fn(async () => 'https://test.checkout.dodopayments.com/portal'),
  };
}
function fixture(offer: 'monthly-card' | 'crypto-30-days' = 'crypto-30-days') {
  const memory = memoryFirestore();
  const attemptId = hash('attempt-for-test');
  memory.rows.set('_bibliotecaBillingCheckouts/' + attemptId, { uid: 'alice', offer, environment: 'test_mode', productId: offer === 'monthly-card' ? 'pdt_monthly' : 'pdt_prepaid' });
  invite(memory.rows, 'alice');
  const subscription: DodoSubscription | undefined = offer === 'monthly-card' ? {
    subscription_id: 'sub_test', product_id: 'pdt_monthly', customer: { customer_id: 'cus_test' }, metadata: { biblioteca_checkout_id: attemptId },
    status: 'active', currency: 'USD', quantity: 1, recurring_pre_tax_amount: 299,
    payment_frequency_count: 1, payment_frequency_interval: 'Month', previous_billing_date: iso(NOW), next_billing_date: iso(NOW + 30 * DAY),
    cancel_at_next_billing_date: false,
  } : undefined;
  const payment: DodoPayment = {
    payment_id: 'pay_test', business_id: 'bus_test', status: 'succeeded', currency: 'USD', total_amount: 299,
    created_at: iso(NOW), updated_at: iso(NOW), metadata: { biblioteca_checkout_id: attemptId }, customer: { customer_id: 'cus_test' },
    product_cart: [{ product_id: offer === 'monthly-card' ? 'pdt_monthly' : 'pdt_prepaid', quantity: 1 }],
    payment_method_type: offer === 'monthly-card' ? 'card' : 'crypto_currency', refunds: [], disputes: [],
    ...(subscription ? { subscription_id: subscription.subscription_id } : {}),
    service_periods: subscription ? [{ subscription_id: subscription.subscription_id, starts_at: iso(NOW), ends_at: iso(NOW + 30 * DAY) }] : [],
  };
  return { ...memory, payment, subscription, client: provider(payment, subscription), attemptId };
}
function event(type = 'payment.succeeded', data: object = { payment_id: 'pay_test' }) {
  return Buffer.from(JSON.stringify({ business_id: 'bus_test', type, timestamp: iso(NOW), data }));
}

beforeEach(() => {
  vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'true');
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Library access and founder codes', () => {
  it('starts the invited trial once, preserves reading after expiry and honors revocation even with Pro', async () => {
    const { db, rows } = memoryFirestore();
    invite(rows, 'alice');
    const first = await ensurePilotEntry(db, 'alice');
    expect(first).toMatchObject({ tier: 'free', canRead: true, canMutate: true, promptLimit: 3, promptCharacterLimit: 2500 });
    expect(first.betaExpiresAt).toBe(iso(NOW + 2 * DAY));
    vi.mocked(Date.now).mockReturnValue(NOW + 3 * DAY);
    const expired = await ensurePilotEntry(db, 'alice');
    expect(expired).toMatchObject({ canRead: true, canMutate: false, betaExpiresAt: first.betaExpiresAt });
    rows.set('_bibliotecaAccessGrants/alice/sources/other-paid', { tier: 'pro', source: 'dodo', startsAt: timestamp(NOW), expiresAt: timestamp(NOW + 30 * DAY) });
    expect(await readLibraryAccess(db, 'alice')).toMatchObject({ canRead: true, canMutate: true, tier: 'pro' });
    rows.delete('_bibliotecaEntitlements/alice');
    expect(await readLibraryAccess(db, 'alice')).toMatchObject({ canRead: false, canMutate: false });
  });
  it('does not onboard an expired or absent invitation and preserves legacy mode', async () => {
    const { db, rows } = memoryFirestore();
    rows.set('_bibliotecaEntitlements/alice', { chatgptPersonalLibrary: true, expiresAt: timestamp(NOW - 1) });
    expect((await ensurePilotEntry(db, 'alice')).canRead).toBe(false);
    expect(rows.has('_bibliotecaPilotEntries/alice')).toBe(false);
    invite(rows, 'bob');
    vi.stubEnv('BIBLIOTECA_LIBRARY_BETA_ENABLED', 'false');
    expect(await ensurePilotEntry(db, 'bob')).toMatchObject({ canRead: true, promptLimit: null, promptCharacterLimit: 10000 });
    expect(rows.has('_bibliotecaPilotEntries/bob')).toBe(false);
  });
  it('restricts issuance to the founder, binds conditions and allows exactly one account to redeem', async () => {
    const { db, rows } = memoryFirestore();
    rows.set('users/founder', { role: 'founder' });
    invite(rows, 'alice'); invite(rows, 'bob');
    const input = { requestId: randomUUID(), durationDays: 30, redeemWithinDays: 7 };
    await expect(issueBillingCode(db, 'alice', input, 'x'.repeat(32))).rejects.toMatchObject({ code: 'access_required' });
    const issued = await issueBillingCode(db, 'founder', input, 'x'.repeat(32));
    expect(await issueBillingCode(db, 'founder', input, 'x'.repeat(32))).toEqual(issued);
    await expect(issueBillingCode(db, 'founder', { ...input, durationDays: 7 }, 'x'.repeat(32))).rejects.toMatchObject({ code: 'invalid_request' });
    const results = await Promise.allSettled([redeemBillingCode(db, 'alice', issued.code), redeemBillingCode(db, 'bob', issued.code)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const winner = results[0].status === 'fulfilled' ? 'alice' : 'bob';
    const receipt = await redeemBillingCode(db, winner, issued.code);
    expect(receipt.expiresAt).toBe(iso(NOW + 30 * DAY));
    expect((await readLibraryAccess(db, winner)).tier).toBe('pro');
    expect(rows.get('_bibliotecaAccessGrants/' + winner)?.proExpiresAt.toMillis()).toBe(NOW + 30 * DAY);
    vi.mocked(Date.now).mockReturnValue(NOW + DAY);
    expect(await redeemBillingCode(db, winner, issued.code)).toEqual(receipt);
    expect(rows.get('_bibliotecaPilotEntries/' + winner)?.expiresAt.toMillis()).toBe(NOW + 2 * DAY);
  });
  it('rejects expired codes and uninvited accounts without consuming them', async () => {
    const { db, rows } = memoryFirestore();
    rows.set('users/founder', { role: 'founder' }); invite(rows, 'alice');
    const issued = await issueBillingCode(db, 'founder', { requestId: randomUUID(), durationDays: 7, redeemWithinDays: 1 }, 'x'.repeat(32));
    await expect(redeemBillingCode(db, 'uninvited', issued.code)).rejects.toMatchObject({ code: 'access_required' });
    await ensurePilotEntry(db, 'alice');
    vi.mocked(Date.now).mockReturnValue(NOW + 2 * DAY);
    await expect(redeemBillingCode(db, 'alice', issued.code)).rejects.toMatchObject({ code: 'code_unavailable' });
  });
  it('lists metadata only and revokes an issued or redeemed code without touching another grant', async () => {
    const { db, rows } = memoryFirestore();
    rows.set('users/founder', { role: 'founder' }); invite(rows, 'alice');
    const issued = await issueBillingCode(db, 'founder', { requestId: randomUUID(), durationDays: 30, redeemWithinDays: 7 }, 'x'.repeat(32));
    const list = await listBillingCodes(db, 'founder');
    expect(list.codes).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(issued.code);
    expect(list.codes[0]).toMatchObject({ redeemed: false, revoked: false });
    await redeemBillingCode(db, 'alice', issued.code);
    rows.set('_bibliotecaAccessGrants/alice/sources/paid_other', { tier: 'pro', source: 'dodo', startsAt: timestamp(NOW), expiresAt: timestamp(NOW + 40 * DAY) });
    await expect(revokeBillingCode(db, 'alice', list.codes[0].id)).rejects.toMatchObject({ code: 'access_required' });
    expect(await revokeBillingCode(db, 'founder', list.codes[0].id)).toEqual({ revoked: true });
    expect(await revokeBillingCode(db, 'founder', list.codes[0].id)).toEqual({ revoked: true });
    expect((await listBillingCodes(db, 'founder')).codes[0]).toMatchObject({ redeemed: true, revoked: true });
    expect(rows.get('_bibliotecaAccessGrants/alice')?.proExpiresAt.toMillis()).toBe(NOW + 40 * DAY);
    await expect(redeemBillingCode(db, 'alice', issued.code)).rejects.toMatchObject({ code: 'code_unavailable' });
  });
});

describe('Dodo sandbox payment reconciliation', () => {
  it('verifies the exact signature and rejects modified bytes, expired timestamps, and unsigned data', () => {
    const raw = event();
    const id = 'msg_test';
    const time = String(Math.floor(NOW / 1000));
    const signature = 'v1,' + createHmac('sha256', Buffer.alloc(32, 7)).update(id + '.' + time + '.').update(raw).digest('base64');
    expect(verifyDodoWebhook(raw, { id, timestamp: time, signature }, config.webhookKey)).toBe(id);
    expect(() => verifyDodoWebhook(Buffer.concat([raw, Buffer.from(' ')]), { id, timestamp: time, signature }, config.webhookKey)).toThrow();
    expect(() => verifyDodoWebhook(raw, { id, timestamp: time, signature }, config.webhookKey, NOW + 301_000)).toThrow();
    expect(() => verifyDodoWebhook(raw, {}, config.webhookKey)).toThrow();
  });
  it('grants a unique prepaid period on duplicate deliveries and rejects a reused event id with other content', async () => {
    const { db, rows, client } = fixture();
    await Promise.all([processBillingWebhook(db, client, config, 'msg_paid', event()), processBillingWebhook(db, client, config, 'msg_paid', event())]);
    const source = [...rows.keys()].find(key => key.includes('/sources/dodo_'))!;
    expect(rows.get(source)?.expiresAt.toMillis()).toBe(NOW + 30 * DAY);
    expect([...rows.keys()].filter(key => key.includes('/sources/dodo_'))).toHaveLength(1);
    await expect(processBillingWebhook(db, client, config, 'msg_paid', event('payment.failed'))).rejects.toMatchObject({ code: 'invalid_webhook' });
  });
  it('uses paid invoice periods for monthly access, cancellation keeps the paid period, and refund revokes only its source', async () => {
    const { db, rows, payment, subscription, client } = fixture('monthly-card');
    rows.set('_bibliotecaAccessGrants/alice/sources/code_other', { tier: 'pro', source: 'code', startsAt: timestamp(NOW), expiresAt: timestamp(NOW + 50 * DAY) });
    await processBillingWebhook(db, client, config, 'msg_monthly', event());
    subscription!.cancel_at_next_billing_date = true;
    await processBillingWebhook(db, client, config, 'msg_cancel', event('subscription.updated', { subscription_id: 'sub_test' }));
    expect((await readLibraryAccess(db, 'alice')).canMutate).toBe(true);
    payment.refunds = [{ status: 'succeeded', amount: 299 }];
    payment.updated_at = iso(NOW + 1000);
    await processBillingWebhook(db, client, config, 'msg_refund', event('refund.succeeded'));
    const source = [...rows.keys()].find(key => key.includes('/sources/dodo_'))!;
    expect(rows.get(source)?.revokedAt).toBeTruthy();
    expect(rows.get('_bibliotecaAccessGrants/alice')?.proExpiresAt.toMillis()).toBe(NOW + 50 * DAY);
  });
  it('does not resurrect a refunded period when a stale success snapshot arrives later', async () => {
    const { db, rows, payment, client } = fixture();
    const stale = structuredClone({ ...payment, refunds: [] }) as DodoPayment;
    payment.refunds = [{ status: 'succeeded', amount: 299 }]; payment.updated_at = iso(NOW + 1000);
    await processBillingWebhook(db, client, config, 'msg_refund_first', event('refund.succeeded'));
    client.getPayment = async () => stale;
    await processBillingWebhook(db, client, config, 'msg_late_success', event());
    const source = [...rows.keys()].find(key => key.includes('/sources/dodo_'))!;
    expect(rows.get(source)?.revokedAt).toBeTruthy();
    expect((await readLibraryAccess(db, 'alice')).tier).toBe('free');
  });
  it('checks business, owned checkout, product and customer before changing access', async () => {
    const { db, payment, client, rows } = fixture();
    payment.business_id = 'other_business';
    await expect(processBillingWebhook(db, client, config, 'wrong_business', event())).rejects.toThrow();
    payment.business_id = config.businessId; payment.product_cart![0].product_id = 'pdt_other';
    await expect(processBillingWebhook(db, client, config, 'wrong_product', event())).rejects.toThrow();
    payment.product_cart![0].product_id = config.prepaidProductId;
    rows.set('_bibliotecaBillingAccounts/alice', { customerId: 'cus_other' });
    await expect(processBillingWebhook(db, client, config, 'wrong_customer', event())).rejects.toThrow();
    expect([...rows.keys()].filter(key => key.includes('/sources/'))).toHaveLength(0);
  });
  it('keeps checkout retries on the same attempt and does not grant access from the return URL', async () => {
    const { db, rows } = memoryFirestore(); invite(rows, 'alice');
    const client = provider({} as DodoPayment);
    const input = { requestId: randomUUID(), offer: 'monthly-card' as const };
    const checkout = await createBillingCheckout(db, client, config, 'alice', { email: 'synthetic@example.test', name: 'Synthetic' }, input);
    expect(await createBillingCheckout(db, client, config, 'alice', { email: 'synthetic@example.test', name: 'Synthetic' }, input)).toEqual(checkout);
    expect(client.createCheckout).toHaveBeenCalledTimes(1);
    expect((await readLibraryAccess(db, 'alice')).tier).toBe('free');
  });
  it('keeps live credentials disabled and rejects checkout redirects outside the sandbox', async () => {
    vi.stubEnv('BIBLIOTECA_BILLING_ENABLED', 'true');
    vi.stubEnv('BIBLIOTECA_DODO_ENVIRONMENT', 'test_mode');
    vi.stubEnv('DODO_PAYMENTS_WEBHOOK_KEY', config.webhookKey);
    vi.stubEnv('BIBLIOTECA_DODO_BUSINESS_ID', config.businessId);
    vi.stubEnv('BIBLIOTECA_DODO_MONTHLY_PRODUCT_ID', config.monthlyProductId);
    vi.stubEnv('BIBLIOTECA_DODO_PREPAID_PRODUCT_ID', config.prepaidProductId);
    vi.stubEnv('BIBLIOTECA_BILLING_ORIGIN', config.origin);
    vi.stubEnv('DODO_PAYMENTS_API_KEY', 'dodo_live_should_never_run');
    expect(readDodoConfig()).toBeUndefined();
    vi.stubEnv('DODO_PAYMENTS_API_KEY', config.apiKey);
    expect(readDodoConfig()?.apiKey).toBe(config.apiKey);
    const transport = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ session_id: 'cks_test', checkout_url: 'https://attacker.invalid' }), { status: 200 }));
    await expect(createDodoClient(config, transport as typeof fetch).createCheckout({
      offer: 'monthly-card', attemptId: hash(randomBytes(8).toString('hex')), email: 'synthetic@example.test', name: 'Synthetic',
    })).rejects.toThrow();
    expect(transport.mock.calls[0][0]).toBe('https://test.dodopayments.com/checkouts');
  });
  it('resolves the Preview sentinel only for the deployment hostname in a Vercel Preview', () => {
    vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'biblioteca-test.vercel.app');
    expect(previewBillingOrigin()).toBe('https://biblioteca-test.vercel.app');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(previewBillingOrigin()).toBeUndefined();
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'biblioteca-test.vercel.app.attacker.invalid');
    expect(previewBillingOrigin()).toBeUndefined();
    vi.stubEnv('VERCEL_URL', 'biblioteca-test.vercel.app/path');
    expect(previewBillingOrigin()).toBeUndefined();
  });
});

describe('Billing HTTP boundaries', () => {
  it('requires Google identity and founder role, rejects foreign origins, and verifies raw webhook bytes before processing', async () => {
    const { db, rows, client } = fixture();
    rows.set('users/founder', { role: 'founder' });
    const auth = {
      async verifyIdToken(token: string) {
        return { uid: token, firebase: { sign_in_provider: token === 'password-user' ? 'password' : 'google.com' } };
      },
      async getUser(uid: string) { return { uid, email: uid + '@example.test', emailVerified: true, disabled: false, displayName: 'Synthetic' }; },
    } as unknown as Auth;
    vi.stubEnv('BIBLIOTECA_BILLING_CODE_SECRET', 'x'.repeat(32));
    const app = express();
    const dependencies = { admin: () => ({ db, auth }), config: () => config, client: () => client };
    installBillingWebhook(app, dependencies);
    app.use(express.json());
    installBillingHttp(app, dependencies);
    const server = createServer(app);
    await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
    try {
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const call = (path: string, token?: string, body?: object, requestOrigin = origin) => fetch(origin + '/api/billing/' + path, {
        method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body ? { 'Content-Type': 'application/json', Origin: requestOrigin } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      expect((await call('status')).status).toBe(401);
      expect((await call('status', 'password-user')).status).toBe(401);
      const status = await call('status', 'alice');
      expect(status.status).toBe(200);
      expect((await status.json() as { access: { canMutate: boolean } }).access.canMutate).toBe(true);
      const input = { requestId: randomUUID(), durationDays: 30, redeemWithinDays: 7 };
      expect((await call('founder/codes', 'founder', input, 'https://unrelated.invalid')).status).toBe(403);
      expect((await call('founder/codes', 'alice', input)).status).toBe(403);
      const issued = await call('founder/codes', 'founder', input);
      expect(issued.status).toBe(200);
      const issuedBody = await issued.json() as { code: string };
      const list = await call('founder/codes', 'founder');
      expect(await list.text()).not.toContain(issuedBody.code);
      vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'biblioteca-test.vercel.app');
      expect((await call('founder/codes', 'founder', { ...input, requestId: randomUUID() }, 'https://biblioteca-test.vercel.app')).status).toBe(200);
      expect((await call('founder/codes', 'founder', { ...input, requestId: randomUUID() }, 'https://otra.vercel.app')).status).toBe(403);
      const raw = Buffer.from(event().toString().replace('{', '{\n  '));
      const id = 'msg_http';
      const time = String(Math.floor(NOW / 1000));
      const signature = 'v1,' + createHmac('sha256', Buffer.alloc(32, 7)).update(id + '.' + time + '.').update(raw).digest('base64');
      const deliver = (signatureValue: string) => fetch(origin + '/api/billing/webhook', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': time, 'webhook-signature': signatureValue }, body: raw,
      });
      expect((await deliver('v1,invalid')).status).toBe(401);
      expect(client.getPayment).not.toHaveBeenCalled();
      expect((await deliver(signature)).status).toBe(200);
      expect((await deliver(signature)).status).toBe(200);
      expect([...rows.keys()].filter(key => key.includes('/sources/dodo_'))).toHaveLength(1);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
