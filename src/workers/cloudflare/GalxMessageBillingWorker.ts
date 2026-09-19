import type { CloudflareEnv } from './GalxEdgeGateway';

type BillingEvent = {
  id: string;
  userId: string;
  requestId: string;
  stripeCustomerId?: string | null;
  stripeMeterEventIdentifier: string;
  attemptCount: number;
  createdAt: string;
};

export class GalxMessageBillingWorker {
  constructor(private readonly env: CloudflareEnv & { STRIPE_SECRET_KEY?: string }) {}

  private async rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: this.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`SUPABASE_RPC_${name}_${response.status}`);
    return await response.json() as T;
  }

  async processBatch(limit = 25): Promise<{ leased: number; delivered: number; failed: number }> {
    if (!this.env.STRIPE_SECRET_KEY) return { leased: 0, delivered: 0, failed: 0 };
    const events = await this.rpc<BillingEvent[]>('fn_lease_nova_message_billing_events', { p_limit: limit });
    let delivered = 0;
    let failed = 0;
    for (const event of events || []) {
      if (!event.stripeCustomerId) {
        failed += 1;
        await this.rpc('fn_mark_nova_message_billing_failed', { p_id: event.id, p_error_code: 'stripe_customer_missing' }).catch(() => undefined);
        continue;
      }
      try {
        const form = new URLSearchParams({
          event_name: 'galx_nova_message_v1',
          identifier: event.stripeMeterEventIdentifier,
          timestamp: String(Math.floor(new Date(event.createdAt).getTime() / 1000)),
          'payload[stripe_customer_id]': event.stripeCustomerId,
          'payload[value]': '1',
        });
        const response = await fetch('https://api.stripe.com/v1/billing/meter_events', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${this.env.STRIPE_SECRET_KEY}:`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`STRIPE_METER_EVENT_${response.status}`);
        await this.rpc('fn_mark_nova_message_billing_sent', { p_id: event.id, p_stripe_customer_id: event.stripeCustomerId });
        delivered += 1;
      } catch (error) {
        failed += 1;
        await this.rpc('fn_mark_nova_message_billing_failed', {
          p_id: event.id,
          p_error_code: error instanceof Error ? error.message : 'stripe_meter_delivery_failed',
        }).catch(() => undefined);
      }
    }
    return { leased: events?.length || 0, delivered, failed };
  }
}
