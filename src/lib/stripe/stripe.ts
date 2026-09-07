import Stripe from 'stripe';
import { getStripeConfig } from './config';

/** Provider access only. Account ownership and durable fulfillment live in billing. */
export class StripeEngine {
  private static instance: StripeEngine;
  private client: Stripe | null = null;
  private key = '';
  static getInstance() { return this.instance ||= new StripeEngine(); }
  getClient() {
    const config = getStripeConfig();
    if (!config.isConfigured) return null;
    if (!this.client || this.key !== config.secretKey) {
      this.key = config.secretKey;
      this.client = new Stripe(this.key, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 2, timeout: 10000 });
    }
    return this.client;
  }
  verifyWebhookSignature(body: string, signature: string) {
    const client = this.getClient();
    if (client) for (const secret of getStripeConfig().webhookSecrets) {
      try { return { isValid: true, event: client.webhooks.constructEvent(body, signature, secret, 300) }; } catch { /* Try rotated secret. */ }
    }
    return { isValid: false, event: undefined };
  }
}
