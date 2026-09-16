/** Events required by the shared durable billing receiver. */
export const BILLING_WEBHOOK_EVENTS = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired',
  'charge.refunded', 'refund.created', 'refund.updated', 'refund.failed',
  'charge.dispute.funds_withdrawn', 'charge.dispute.funds_reinstated',
  'invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed',
  'invoice.finalized', 'invoice.voided', 'invoice.marked_uncollectible',
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
] as const;
