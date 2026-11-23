import { createHash } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { billingRequestId } from './billingCodes';
import { BillingError, type BillingOffer, type DodoClient, type DodoConfig, type DodoPayment, type DodoSubscription } from './billingDodo';
import { libraryGrantRef, readLibraryAccess, readLibraryGrantState, writeLibraryAccessBootstrap, writeLibraryGrant } from './libraryAccess';

const DAY = 24 * 60 * 60_000;
const hash = (value: string) => createHash('sha256').update(value).digest('base64url');
const providerId = z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/);
export const billingCheckoutSchema = z.strictObject({ requestId: billingRequestId, offer: z.enum(['monthly-card', 'crypto-30-days']) });
const webhookSchema = z.object({
  business_id: providerId, type: z.string().min(1).max(100),
  timestamp: z.iso.datetime({ offset: true }), data: z.record(z.string(), z.unknown()),
});
const invalidBilling = () => new BillingError('invalid_request', 'No pudimos comprobar esta operación de pago.');

export async function createBillingCheckout(
  db: Firestore, client: DodoClient, config: DodoConfig, uid: string,
  identity: { email: string; name: string }, input: z.infer<typeof billingCheckoutSchema>,
) {
  const attemptId = hash(JSON.stringify([uid, input.requestId]));
  const ref = db.collection('_bibliotecaBillingCheckouts').doc(attemptId);
  const saved = await db.runTransaction(async tx => {
    const access = await readLibraryAccess(db, uid, tx);
    const previous = await tx.get(ref);
    if (!access.canRead) throw new BillingError('access_required', 'Necesitas una invitación activa a Biblioteca para probar Pro.');
    if (previous.exists) {
      if (previous.get('offer') !== input.offer || previous.get('uid') !== uid) throw invalidBilling();
      return previous.data();
    }
    writeLibraryAccessBootstrap(tx, db, uid, access);
    tx.create(ref, { uid, offer: input.offer, productId: input.offer === 'monthly-card' ? config.monthlyProductId : config.prepaidProductId,
      createdAt: Timestamp.now(), environment: 'test_mode' });
    return undefined;
  });
  if (saved?.checkoutUrl) return { checkoutUrl: saved.checkoutUrl as string };
  await client.validateProduct(input.offer);
  const account = await db.collection('_bibliotecaBillingAccounts').doc(uid).get();
  const checkout = await client.createCheckout({ offer: input.offer, attemptId, ...identity,
    ...(account.get('customerId') ? { customerId: account.get('customerId') as string } : {}) });
  await ref.set({ sessionId: checkout.sessionId, checkoutUrl: checkout.checkoutUrl }, { merge: true });
  return { checkoutUrl: checkout.checkoutUrl };
}

function validateSubscription(value: DodoSubscription, config: DodoConfig) {
  if (value.product_id !== config.monthlyProductId || value.currency !== 'USD' || value.quantity !== 1
    || value.recurring_pre_tax_amount !== 299 || value.payment_frequency_count !== 1 || value.payment_frequency_interval !== 'Month') throw invalidBilling();
}

function paymentIsReversed(payment: DodoPayment) {
  const refunded = payment.refunds.filter(item => item.status === 'succeeded').reduce((sum, item) => sum + item.amount, 0);
  const dispute = payment.disputes.some(item => !['dispute_won', 'dispute_cancelled'].includes(item.dispute_status));
  return payment.status !== 'succeeded' || refunded >= payment.total_amount || dispute;
}

function paidPeriod(payment: DodoPayment, subscription?: DodoSubscription) {
  const period = subscription && payment.service_periods.find(item => item.subscription_id === subscription.subscription_id);
  const starts = Date.parse(period?.starts_at ?? subscription?.previous_billing_date ?? payment.updated_at);
  const expires = subscription ? Date.parse(period?.ends_at ?? subscription.next_billing_date) : starts + 30 * DAY;
  if (!Number.isFinite(starts) || !Number.isFinite(expires) || expires <= starts || expires - starts > 35 * DAY) throw invalidBilling();
  return { starts, expires };
}

/** Process only after signature verification. Canonical API state controls access, not delivery order. */
export async function processBillingWebhook(
  db: Firestore, client: DodoClient, config: DodoConfig, eventId: string, raw: Buffer,
) {
  const event = webhookSchema.parse(JSON.parse(raw.toString('utf8')));
  if (event.business_id !== config.businessId) throw new BillingError('invalid_webhook', 'El webhook pertenece a otro comercio.');
  const receiptRef = db.collection('_bibliotecaBillingEvents').doc(hash(eventId));
  const digest = hash(raw.toString('utf8'));
  const previous = await receiptRef.get();
  if (previous.exists) {
    if (previous.get('digest') !== digest) throw new BillingError('invalid_webhook', 'El identificador del webhook ya se utilizó.');
    return;
  }

  const paymentEvent = /^(payment|refund|dispute)\./.test(event.type);
  const subscriptionEvent = /^subscription\./.test(event.type);
  if (!paymentEvent && !subscriptionEvent) {
    await receiptRef.create({ digest, ignored: true, receivedAt: Timestamp.now() }).catch(async error => {
      if ((await receiptRef.get()).get('digest') !== digest) throw error;
    });
    return;
  }

  let payment: DodoPayment | undefined;
  let subscription: DodoSubscription | undefined;
  if (paymentEvent) {
    const paymentId = providerId.parse(event.data.payment_id);
    payment = await client.getPayment(paymentId);
    if (payment.payment_id !== paymentId || payment.business_id !== config.businessId || payment.currency !== 'USD'
      || payment.total_amount < 299) throw invalidBilling();
    if (payment.subscription_id) subscription = await client.getSubscription(payment.subscription_id);
  } else {
    subscription = await client.getSubscription(providerId.parse(event.data.subscription_id));
  }
  if (subscription) validateSubscription(subscription, config);
  const attemptId = payment?.metadata.biblioteca_checkout_id || subscription?.metadata.biblioteca_checkout_id;
  if (!attemptId || !/^[A-Za-z0-9_-]{43}$/.test(attemptId)) throw invalidBilling();
  const attemptRef = db.collection('_bibliotecaBillingCheckouts').doc(attemptId);
  const binding = await attemptRef.get();
  const uid = binding.get('uid') as string | undefined;
  if (!uid || binding.get('environment') !== 'test_mode') throw invalidBilling();
  const offer = binding.get('offer') as BillingOffer;
  if ((offer === 'monthly-card') !== Boolean(subscription)) throw invalidBilling();
  if (subscription && subscription.customer.customer_id !== payment?.customer.customer_id && payment) throw invalidBilling();
  if (offer === 'crypto-30-days' && (!payment?.product_cart || payment.product_cart.length !== 1
    || payment.product_cart[0].product_id !== config.prepaidProductId || payment.product_cart[0].quantity !== 1)) throw invalidBilling();

  const sourceId = payment ? 'dodo_' + hash(payment.payment_id) : '';
  const sourceRef = payment ? libraryGrantRef(db, uid, sourceId) : null;
  await db.runTransaction(async tx => {
    const [receipt, attempt, account, current] = await tx.getAll(
      receiptRef, attemptRef, db.collection('_bibliotecaBillingAccounts').doc(uid), ...(sourceRef ? [sourceRef] : []),
    );
    const sources = payment ? await readLibraryGrantState(db, uid, tx) : [];
    if (receipt.exists) {
      if (receipt.get('digest') !== digest) throw new BillingError('invalid_webhook', 'El identificador del webhook ya se utilizó.');
      return;
    }
    if (attempt.get('uid') !== uid || attempt.get('offer') !== offer || (attempt.get('customerId')
      && attempt.get('customerId') !== (payment?.customer.customer_id ?? subscription?.customer.customer_id))) throw invalidBilling();
    const customerId = payment?.customer.customer_id ?? subscription!.customer.customer_id;
    if (account.get('customerId') && account.get('customerId') !== customerId) throw invalidBilling();
    if (payment) {
      const providerUpdated = Date.parse(payment.updated_at);
      const previousUpdated = current?.get('providerUpdatedAt')?.toMillis?.() ?? 0;
      const reversed = paymentIsReversed(payment);
      // A concurrently fetched older snapshot cannot restore a refunded or disputed payment.
      if (providerUpdated > previousUpdated || (providerUpdated === previousUpdated && (!current?.exists || reversed))) {
        const period = paidPeriod(payment, subscription);
        const lockedPeriod = current?.get('periodGranted') === true;
        const startsAt = lockedPeriod ? current!.get('startsAt') : Timestamp.fromMillis(Math.min(period.starts, Date.now()));
        const expiresAt = lockedPeriod ? current!.get('expiresAt') : Timestamp.fromMillis(period.expires);
        writeLibraryGrant(tx, db, uid, sourceId, {
          tier: 'pro', source: 'dodo', startsAt, expiresAt, revokedAt: reversed ? Timestamp.now() : null,
        }, sources);
        tx.set(sourceRef!, { paymentId: payment.payment_id, providerUpdatedAt: Timestamp.fromMillis(providerUpdated), periodGranted: lockedPeriod || !reversed,
          offer, customerId }, { merge: true });
      }
    }
    tx.set(db.collection('_bibliotecaBillingAccounts').doc(uid), {
      customerId, environment: 'test_mode',
      ...(subscription ? { subscriptionId: subscription.subscription_id, subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_next_billing_date, currentPeriodEnd: subscription.next_billing_date } : {}),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    tx.set(attemptRef, { customerId }, { merge: true });
    tx.create(receiptRef, { digest, receivedAt: Timestamp.now(), type: event.type });
  });
}
